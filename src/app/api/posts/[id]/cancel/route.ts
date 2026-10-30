import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const DRAFTS_PATH = '/posts/drafts.json';
const SCHEDULED_PATH = '/posts/scheduled.json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;

  const scheduled = await BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []);
  const target = scheduled.find((p) => p.id === id);

  if (!target) {
    return NextResponse.json({ error: 'Scheduled post not found' }, { status: 404 });
  }

  const cancelledPost: Post = {
    ...target,
    status: 'cancelled',
    updatedAt: new Date().toISOString(),
  };

  // Remove from scheduled, move to drafts
  await Promise.all([
    BlobStorageService.updateJson<Post[]>(SCHEDULED_PATH, (list) => (list || []).filter((p) => p.id !== id), []),
    BlobStorageService.updateJson<Post[]>(DRAFTS_PATH, (list) => [cancelledPost, ...(list || [])], []),
  ]);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'POST_SCHEDULE_CANCELLED',
    category: 'posts',
    status: 'info',
    details: `Cancelled scheduled publishing for post "${id}".`,
  });

  return NextResponse.json({ success: true, post: cancelledPost });
}

