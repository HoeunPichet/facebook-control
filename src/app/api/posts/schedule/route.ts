import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post, PostSchema, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const SCHEDULED_PATH = '/posts/scheduled.json';
const DRAFTS_PATH = '/posts/drafts.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      postId,
      captionKhmer,
      captionEnglish,
      imageUrls,
      scheduledPublishTime,
      productPriceUsd,
      productPriceKhr,
      tags,
    } = body;

    if (!scheduledPublishTime) {
      return NextResponse.json(
        { error: 'Scheduled publish time is required' },
        { status: 400 }
      );
    }

    const scheduledDate = new Date(scheduledPublishTime);
    if (isNaN(scheduledDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid scheduled publish date/time format' },
        { status: 400 }
      );
    }

    // Check that schedule time is at least 1 minute in the future
    if (scheduledDate.getTime() <= Date.now() + 60 * 1000) {
      return NextResponse.json(
        { error: 'Scheduled time must be at least 1-2 minutes in the future' },
        { status: 400 }
      );
    }

    const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);
    if (!account || !account.selectedPageId) {
      return NextResponse.json(
        { error: 'No active Facebook Page connected' },
        { status: 400 }
      );
    }

    const id = postId || `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = `idem_sched_${id}_${scheduledDate.getTime()}`;

    const scheduledPost: Post = PostSchema.parse({
      id,
      pageId: account.selectedPageId,
      captionKhmer: captionKhmer || '',
      captionEnglish: captionEnglish || '',
      imageUrls: imageUrls || [],
      status: 'scheduled',
      scheduledPublishTime: scheduledDate.toISOString(),
      scheduledTimezone: 'Asia/Phnom_Penh',
      productPriceUsd: productPriceUsd ? Number(productPriceUsd) : undefined,
      productPriceKhr: productPriceKhr ? Number(productPriceKhr) : undefined,
      tags: tags || [],
      retryCount: 0,
      maxRetries: 3,
      idempotencyKey,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Add to scheduled queue and remove from drafts if it existed as draft
    await Promise.all([
      BlobStorageService.updateJson<Post[]>(SCHEDULED_PATH, (list) => {
        const filtered = (list || []).filter((p) => p.id !== id);
        return [...filtered, scheduledPost];
      }, []),
      BlobStorageService.updateJson<Post[]>(DRAFTS_PATH, (list) => (list || []).filter((p) => p.id !== id), []),
    ]);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'POST_SCHEDULED',
      category: 'cron',
      status: 'info',
      details: `Scheduled handbag post "${id}" for publication at ${scheduledDate.toLocaleString('en-GB', { timeZone: 'Asia/Phnom_Penh' })} (Asia/Phnom_Penh).`,
      metadata: { postId: id, scheduledPublishTime: scheduledDate.toISOString() },
    });

    return NextResponse.json({ success: true, post: scheduledPost });
  } catch (error: any) {
    console.error('[Post Schedule Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to schedule post' },
      { status: 400 }
    );
  }
}

