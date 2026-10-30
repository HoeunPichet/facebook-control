import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { GroupSharingTask, GroupItem } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const QUEUE_PATH = '/groups/sharing-queue.json';
const GROUPS_PATH = '/groups/group-list.json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const { action, notes } = await request.json(); // action: 'complete' | 'skip'

  let targetGroupId: string | null = null;
  let updatedTask: GroupSharingTask | null = null;

  await BlobStorageService.updateJson<GroupSharingTask[]>(QUEUE_PATH, (list) => {
    return (list || []).map((t) => {
      if (t.id === id) {
        targetGroupId = t.groupId;
        const updated: GroupSharingTask = {
          ...t,
          status: action === 'complete' ? 'completed' : 'skipped',
          completedAt: new Date().toISOString(),
          completedBy: 'Administrator',
          notes: notes || t.notes,
        };
        updatedTask = updated;
        return updated;
      }
      return t;
    });
  }, []);

  // If marked complete, update GroupItem lastSharedAt & totalSharesCompleted
  if (action === 'complete' && targetGroupId) {
    await BlobStorageService.updateJson<GroupItem[]>(GROUPS_PATH, (groups) => {
      return (groups || []).map((g) => {
        if (g.id === targetGroupId) {
          return {
            ...g,
            lastSharedAt: new Date().toISOString(),
            totalSharesCompleted: (g.totalSharesCompleted || 0) + 1,
          };
        }
        return g;
      });
    }, []);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'GROUP_TASK_COMPLETED',
      category: 'groups',
      status: 'success',
      details: `Completed handbag post sharing task in Group "${updatedTask ? (updatedTask as GroupSharingTask).groupName : id}".`,
    });
  }

  return NextResponse.json({ success: true, task: updatedTask });
}

