import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post, FacebookAccount } from '@/lib/types';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';
import { verifySessionToken } from '@/lib/auth';

const SCHEDULED_PATH = '/posts/scheduled.json';
const PUBLISHED_PATH = '/posts/published.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

/**
 * Validates whether the caller is authorized to invoke cron tasks.
 */
function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  // 1. Check Bearer CRON_SECRET (standard Vercel Cron header)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // 2. Check query param ?secret=
  const { searchParams } = new URL(request.url);
  const secretParam = searchParams.get('secret');
  if (cronSecret && secretParam === cronSecret) {
    return true;
  }

  // 3. Check admin session cookie (allows manual execution from dashboard)
  const sessionCookie = request.cookies.get('fb_admin_session')?.value;
  if (sessionCookie && verifySessionToken(sessionCookie).valid) {
    return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET or session' }, { status: 401 });
  }

  const now = new Date();
  const results = {
    totalChecked: 0,
    dueCount: 0,
    succeeded: 0,
    failed: 0,
    retried: 0,
    details: [] as Array<{ id: string; status: string; message: string }>,
  };

  try {
    // 1. Atomically fetch and lock tasks that are due
    const scheduledPosts = await BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []);
    results.totalChecked = scheduledPosts.length;

    const duePosts = scheduledPosts.filter((post) => {
      if (post.status !== 'scheduled') return false;
      if (!post.scheduledPublishTime) return false;
      return new Date(post.scheduledPublishTime).getTime() <= now.getTime();
    });

    results.dueCount = duePosts.length;

    if (duePosts.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending scheduled tasks due at this time.',
        results,
      });
    }

    // 2. Retrieve connected account & page token
    const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);
    if (!account) {
      throw new Error('No Facebook account connected. Cannot execute scheduled tasks.');
    }

    const metaClient = new MetaApiClient();

    for (const post of duePosts) {
      // Find matching page or fallback to selected page
      const targetPage = account.pages.find((p) => p.id === post.pageId) || account.pages.find((p) => p.id === account.selectedPageId);

      if (!targetPage) {
        post.status = 'failed';
        post.lastError = `Facebook Page ${post.pageId} no longer accessible`;
        results.failed++;
        results.details.push({ id: post.id, status: 'failed', message: post.lastError });
        continue;
      }

      try {
        const pageToken = decryptToken(targetPage.encryptedPageAccessToken);

        // Compose post message
        const messageParts: string[] = [];
        if (post.captionKhmer) messageParts.push(post.captionKhmer);
        if (post.captionEnglish) messageParts.push(post.captionEnglish);
        if (post.productPriceUsd) {
          messageParts.push(`\n💰 Price: $${post.productPriceUsd} ${post.productPriceKhr ? `(${post.productPriceKhr.toLocaleString()} KHR)` : ''}`);
        }
        const fullMessage = messageParts.join('\n\n');

        // Publish to Meta Graph API
        const metaResult = await metaClient.publishMultiPhotoPost(
          targetPage.id,
          pageToken,
          {
            message: fullMessage,
            imageUrls: post.imageUrls,
          }
        );

        const publishedPost: Post = {
          ...post,
          status: 'published',
          publishedTime: new Date().toISOString(),
          facebookPostId: metaResult.id,
          facebookPermalink: `https://www.facebook.com/${metaResult.id}`,
          updatedAt: new Date().toISOString(),
          lastError: undefined,
        };

        // Move to published store
        await Promise.all([
          BlobStorageService.updateJson<Post[]>(PUBLISHED_PATH, (list) => [publishedPost, ...(list || [])], []),
          BlobStorageService.updateJson<Post[]>(SCHEDULED_PATH, (list) => (list || []).filter((p) => p.id !== post.id), []),
        ]);

        results.succeeded++;
        results.details.push({ id: post.id, status: 'published', message: `Published as ${metaResult.id}` });

        await BlobStorageService.recordActivity({
          actor: 'Vercel Cron Worker',
          action: 'SCHEDULED_POST_PUBLISHED',
          category: 'cron',
          status: 'success',
          details: `Scheduled task published handbag post "${post.id}" to Page "${targetPage.name}" (Meta ID: ${metaResult.id}).`,
          metadata: { postId: post.id, metaId: metaResult.id, pageId: targetPage.id },
        });
      } catch (postError: any) {
        console.error(`[Cron Worker] Failed to publish post ${post.id}:`, postError);
        post.retryCount = (post.retryCount || 0) + 1;
        post.lastError = postError.message || 'Meta API execution failure';
        post.updatedAt = new Date().toISOString();

        if (post.retryCount >= post.maxRetries) {
          post.status = 'failed';
          results.failed++;
          results.details.push({ id: post.id, status: 'failed', message: `Exceeded max retries: ${post.lastError}` });

          await BlobStorageService.recordActivity({
            actor: 'Vercel Cron Worker',
            action: 'SCHEDULED_POST_EXHAUSTED',
            category: 'cron',
            status: 'error',
            details: `Scheduled post "${post.id}" failed after ${post.retryCount} attempts. Error: ${post.lastError}`,
            metadata: { postId: post.id, error: post.lastError },
          });
        } else {
          // Delay next retry by 10 minutes
          const retryTime = new Date(Date.now() + 10 * 60 * 1000);
          post.scheduledPublishTime = retryTime.toISOString();
          results.retried++;
          results.details.push({ id: post.id, status: 'retried', message: `Scheduled retry ${post.retryCount}/${post.maxRetries}` });

          await BlobStorageService.recordActivity({
            actor: 'Vercel Cron Worker',
            action: 'SCHEDULED_POST_RETRY',
            category: 'cron',
            status: 'warning',
            details: `Scheduled post "${post.id}" retry #${post.retryCount} scheduled for ${retryTime.toISOString()}. Error: ${post.lastError}`,
          });
        }

        // Update post in scheduled queue
        await BlobStorageService.updateJson<Post[]>(SCHEDULED_PATH, (list) => {
          return (list || []).map((p) => (p.id === post.id ? post : p));
        }, []);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      results,
    });
  } catch (err: any) {
    console.error('[Cron Worker Fatal Error]:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Task processing failure' },
      { status: 500 }
    );
  }
}

