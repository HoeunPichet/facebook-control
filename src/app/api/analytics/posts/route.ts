import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const PUBLISHED_PATH = '/posts/published.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const posts = await BlobStorageService.getJson<Post[]>(PUBLISHED_PATH, []);

  return NextResponse.json({
    success: true,
    totalPublished: posts.length,
    posts,
  });
}

