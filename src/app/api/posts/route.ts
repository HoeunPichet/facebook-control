import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post, PostSchema, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const DRAFTS_PATH = '/posts/drafts.json';
const SCHEDULED_PATH = '/posts/scheduled.json';
const PUBLISHED_PATH = '/posts/published.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get('status');

  const [drafts, scheduled, published] = await Promise.all([
    BlobStorageService.getJson<Post[]>(DRAFTS_PATH, []),
    BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []),
    BlobStorageService.getJson<Post[]>(PUBLISHED_PATH, []),
  ]);

  let allPosts = [...published, ...scheduled, ...drafts];

  if (statusFilter && statusFilter !== 'all') {
    allPosts = allPosts.filter((p) => p.status === statusFilter);
  }

  // Sort newest first
  allPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    success: true,
    posts: allPosts,
    counts: {
      all: allPosts.length,
      published: published.length,
      scheduled: scheduled.length,
      draft: drafts.filter((d) => d.status === 'draft').length,
      failed: allPosts.filter((p) => p.status === 'failed').length,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);

    if (!account || !account.selectedPageId) {
      return NextResponse.json(
        { error: 'No active Facebook Page connected. Please connect and select a Page in Facebook Accounts.' },
        { status: 400 }
      );
    }

    const selectedPage = account.pages.find((p) => p.id === account.selectedPageId);
    if (!selectedPage) {
      return NextResponse.json(
        { error: 'Selected Facebook Page not found in account configuration.' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const idempotencyKey = body.idempotencyKey || `idem_${postId}`;

    const newPost: Post = PostSchema.parse({
      id: postId,
      pageId: selectedPage.id,
      captionKhmer: body.captionKhmer || '',
      captionEnglish: body.captionEnglish || '',
      imageUrls: body.imageUrls || [],
      status: body.publishNow ? 'publishing' : (body.status || 'draft'),
      scheduledPublishTime: body.scheduledPublishTime,
      scheduledTimezone: body.scheduledTimezone || 'Asia/Phnom_Penh',
      productPriceUsd: body.productPriceUsd ? Number(body.productPriceUsd) : undefined,
      productPriceKhr: body.productPriceKhr ? Number(body.productPriceKhr) : undefined,
      tags: body.tags || [],
      retryCount: 0,
      maxRetries: 3,
      idempotencyKey,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    // If user requested immediate publishing
    if (body.publishNow) {
      const pageToken = decryptToken(selectedPage.encryptedPageAccessToken);
      const metaClient = new MetaApiClient();

      // Combine captions
      const messageParts: string[] = [];
      if (newPost.captionKhmer) messageParts.push(newPost.captionKhmer);
      if (newPost.captionEnglish) messageParts.push(newPost.captionEnglish);
      if (newPost.productPriceUsd) {
        messageParts.push(`\n💰 Price: $${newPost.productPriceUsd} ${newPost.productPriceKhr ? `(${newPost.productPriceKhr.toLocaleString()} KHR)` : ''}`);
      }
      const fullMessage = messageParts.join('\n\n');

      try {
        const metaResult = await metaClient.publishMultiPhotoPost(
          selectedPage.id,
          pageToken,
          {
            message: fullMessage,
            imageUrls: newPost.imageUrls,
          }
        );

        newPost.status = 'published';
        newPost.publishedTime = new Date().toISOString();
        newPost.facebookPostId = metaResult.id;
        newPost.facebookPermalink = `https://www.facebook.com/${metaResult.id}`;

        // Save to published store
        await BlobStorageService.updateJson<Post[]>(PUBLISHED_PATH, (posts) => [newPost, ...(posts || [])], []);

        await BlobStorageService.recordActivity({
          actor: 'Administrator',
          action: 'POST_PUBLISHED',
          category: 'posts',
          status: 'success',
          details: `Published handbag post to Page "${selectedPage.name}" (Meta ID: ${metaResult.id}).`,
          metadata: { postId: newPost.id, metaId: metaResult.id, pageId: selectedPage.id },
        });

        return NextResponse.json({ success: true, post: newPost });
      } catch (metaErr: any) {
        console.error('[Immediate Publish Failed]:', metaErr);
        newPost.status = 'failed';
        newPost.lastError = metaErr.message || 'Meta API publishing error';

        await BlobStorageService.updateJson<Post[]>(DRAFTS_PATH, (posts) => [newPost, ...(posts || [])], []);

        await BlobStorageService.recordActivity({
          actor: 'Administrator',
          action: 'POST_PUBLISH_FAILED',
          category: 'posts',
          status: 'error',
          details: `Failed to publish post: ${metaErr.message}`,
          metadata: { postId: newPost.id, error: metaErr.message },
        });

        return NextResponse.json(
          { success: false, error: `Publishing failed: ${metaErr.message}`, post: newPost },
          { status: 500 }
        );
      }
    }

    // Otherwise save as draft
    await BlobStorageService.updateJson<Post[]>(DRAFTS_PATH, (posts) => [newPost, ...(posts || [])], []);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'POST_DRAFT_CREATED',
      category: 'posts',
      status: 'info',
      details: `Created post draft "${postId}".`,
    });

    return NextResponse.json({ success: true, post: newPost });
  } catch (error: any) {
    console.error('[Create Post Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create post' },
      { status: 400 }
    );
  }
}

