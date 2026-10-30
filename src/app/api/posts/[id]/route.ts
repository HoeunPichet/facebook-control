import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const DRAFTS_PATH = '/posts/drafts.json';
const SCHEDULED_PATH = '/posts/scheduled.json';
const PUBLISHED_PATH = '/posts/published.json';

async function findPost(id: string): Promise<{ post: Post | null; location: 'drafts' | 'scheduled' | 'published' | null }> {
  const [drafts, scheduled, published] = await Promise.all([
    BlobStorageService.getJson<Post[]>(DRAFTS_PATH, []),
    BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []),
    BlobStorageService.getJson<Post[]>(PUBLISHED_PATH, []),
  ]);

  const inDrafts = drafts.find((p) => p.id === id);
  if (inDrafts) return { post: inDrafts, location: 'drafts' };

  const inScheduled = scheduled.find((p) => p.id === id);
  if (inScheduled) return { post: inScheduled, location: 'scheduled' };

  const inPublished = published.find((p) => p.id === id);
  if (inPublished) return { post: inPublished, location: 'published' };

  return { post: null, location: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const { post } = await findPost(id);

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, post });
}

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

  const { post, location } = await findPost(id);
  if (!post || !location) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const targetPath =
    location === 'drafts'
      ? DRAFTS_PATH
      : location === 'scheduled'
      ? SCHEDULED_PATH
      : PUBLISHED_PATH;

  let updatedPost: Post | null = null;

  await BlobStorageService.updateJson<Post[]>(targetPath, (posts) => {
    const list = Array.isArray(posts) ? posts : [];
    return list.map((item) => {
      if (item.id === id) {
        const merged: Post = {
          ...item,
          ...body,
          updatedAt: new Date().toISOString(),
        };
        updatedPost = merged;
        return merged;
      }
      return item;
    });
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'POST_UPDATED',
    category: 'posts',
    status: 'info',
    details: `Updated post "${id}".`,
  });

  return NextResponse.json({ success: true, post: updatedPost });
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
  const { post, location } = await findPost(id);

  if (!post || !location) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const targetPath =
    location === 'drafts'
      ? DRAFTS_PATH
      : location === 'scheduled'
      ? SCHEDULED_PATH
      : PUBLISHED_PATH;

  await BlobStorageService.updateJson<Post[]>(targetPath, (posts) => {
    const list = Array.isArray(posts) ? posts : [];
    return list.filter((item) => item.id !== id);
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'POST_DELETED',
    category: 'posts',
    status: 'info',
    details: `Deleted post "${id}" from ${location}.`,
  });

  return NextResponse.json({ success: true, message: 'Post deleted successfully' });
}
