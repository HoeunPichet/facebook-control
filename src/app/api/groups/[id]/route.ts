import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { GroupItem } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const GROUPS_PATH = '/groups/group-list.json';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  let updated: GroupItem | null = null;

  await BlobStorageService.updateJson<GroupItem[]>(GROUPS_PATH, (list) => {
    return (list || []).map((g) => {
      if (g.id === id) {
        const merged: GroupItem = { ...g, ...body };
        updated = merged;
        return merged;
      }
      return g;
    });
  }, []);

  return NextResponse.json({ success: true, group: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;

  await BlobStorageService.updateJson<GroupItem[]>(GROUPS_PATH, (list) => {
    return (list || []).filter((g) => g.id !== id);
  }, []);

  return NextResponse.json({ success: true, message: 'Group removed from directory' });
}

