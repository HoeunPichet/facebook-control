import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { GroupSharingTask, GroupSharingTaskSchema, GroupItem } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const QUEUE_PATH = '/groups/sharing-queue.json';
const GROUPS_PATH = '/groups/group-list.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const tasks = await BlobStorageService.getJson<GroupSharingTask[]>(QUEUE_PATH, []);
  return NextResponse.json({ success: true, tasks });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = `gtask_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newTask = GroupSharingTaskSchema.parse({
      id,
      groupId: body.groupId,
      groupName: body.groupName,
      groupUrl: body.groupUrl,
      postId: body.postId,
      postCaption: body.postCaption || '',
      postImageUrls: body.postImageUrls || [],
      status: 'pending',
      scheduledFor: body.scheduledFor || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    await BlobStorageService.updateJson<GroupSharingTask[]>(
      QUEUE_PATH,
      (list) => [newTask, ...(list || [])],
      []
    );

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'GROUP_TASK_QUEUED',
      category: 'groups',
      status: 'info',
      details: `Queued manual sharing task for Group "${newTask.groupName}".`,
    });

    return NextResponse.json({ success: true, task: newTask });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to queue group task' },
      { status: 400 }
    );
  }
}

