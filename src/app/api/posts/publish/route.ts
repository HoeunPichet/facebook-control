import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const DRAFTS_PATH = '/posts/drafts.json';
const SCHEDULED_PATH = '/posts/scheduled.json';
const PUBLISHED_PATH = '/posts/published.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const { postId } = await request.json();
    if (!postId) {
      return NextResponse.json({ error: 'Missing postId parameter' }, { status: 400 });
    }

    // 1. Find the post in drafts or scheduled
    const [drafts, scheduled] = await Promise.all([
      BlobStorageService.getJson<Post[]>(DRAFTS_PATH, []),
      BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []),
    ]);

    let targetPost = drafts.find((p) => p.id === postId) || scheduled.find((p) => p.id === postId);

    if (!targetPost) {
      return NextResponse.json({ error: 'Post not found in drafts or scheduled queue' }, { status: 404 });
    }

    // 2. Fetch Facebook Page and Page Token
    const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);
    if (!account || !account.selectedPageId) {
      return NextResponse.json(
        { error: 'No active Facebook Page connected. Please select a page in Facebook Accounts.' },
        { status: 400 }
      );
    }

    const selectedPage = account.pages.find((p) => p.id === account.selectedPageId);
    if (!selectedPage) {
      return NextResponse.json(
        { error: 'Selected Facebook Page is invalid or missing' },
        { status: 400 }
      );
    }

    const pageToken = decryptToken(selectedPage.encryptedPageAccessToken);
    const metaClient = new MetaApiClient();

    // 3. Compose message
    const messageParts: string[] = [];
    if (targetPost.captionKhmer) messageParts.push(targetPost.captionKhmer);
    if (targetPost.captionEnglish) messageParts.push(targetPost.captionEnglish);
    if (targetPost.productPriceUsd) {
      messageParts.push(`\n💰 Price: $${targetPost.productPriceUsd} ${targetPost.productPriceKhr ? `(${targetPost.productPriceKhr.toLocaleString()} KHR)` : ''}`);
    }
    const fullMessage = messageParts.join('\n\n');

    // 4. Publish to Meta Graph API
    const metaResult = await metaClient.publishMultiPhotoPost(
      selectedPage.id,
      pageToken,
      {
        message: fullMessage,
        imageUrls: targetPost.imageUrls,
      }
    );

    // 5. Update post record
    const updatedPost: Post = {
      ...targetPost,
      status: 'published',
      publishedTime: new Date().toISOString(),
      facebookPostId: metaResult.id,
      facebookPermalink: `https://www.facebook.com/${metaResult.id}`,
      updatedAt: new Date().toISOString(),
      lastError: undefined,
    };

    // Remove from drafts and scheduled, prepend to published
    await Promise.all([
      BlobStorageService.updateJson<Post[]>(DRAFTS_PATH, (list) => (list || []).filter((p) => p.id !== postId), []),
      BlobStorageService.updateJson<Post[]>(SCHEDULED_PATH, (list) => (list || []).filter((p) => p.id !== postId), []),
      BlobStorageService.updateJson<Post[]>(PUBLISHED_PATH, (list) => [updatedPost, ...(list || [])], []),
    ]);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'POST_PUBLISHED',
      category: 'posts',
      status: 'success',
      details: `Published post "${postId}" to Page "${selectedPage.name}" (Meta ID: ${metaResult.id}).`,
      metadata: { postId, metaId: metaResult.id, pageId: selectedPage.id },
    });

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });
  } catch (error: any) {
    console.error('[Publish Post Route Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to publish post' },
      { status: 500 }
    );
  }
}

