import { NextRequest, NextResponse } from 'next/server';
import { MetaApiClient } from '@/lib/meta/client';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { encryptToken } from '@/lib/crypto';
import { FacebookAccount, FacebookPage } from '@/lib/types';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  const redirectUrl = new URL('/accounts', request.url);

  if (error) {
    console.error('[Facebook OAuth Callback Error]:', error, errorDescription);
    redirectUrl.searchParams.set('error', errorDescription || error);
    return NextResponse.redirect(redirectUrl);
  }

  // 1. Verify CSRF State
  const savedState = request.cookies.get('fb_oauth_state')?.value;
  if (!state || !savedState || state !== savedState) {
    redirectUrl.searchParams.set('error', 'CSRF State mismatch or session expired. Please try connecting again.');
    return NextResponse.redirect(redirectUrl);
  }

  if (!code) {
    redirectUrl.searchParams.set('error', 'Missing authorization code from Meta.');
    return NextResponse.redirect(redirectUrl);
  }

  try {
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const redirectUri = process.env.META_REDIRECT_URI || `${protocol}://${host}/api/facebook/callback`;

    const metaClient = new MetaApiClient();

    // 2. Exchange code for long-lived User Token
    const tokenData = await metaClient.exchangeCodeForLongLivedToken(code, redirectUri);
    const userAccessToken = tokenData.accessToken;
    const expiresAt = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString();

    // 3. Fetch User Profile
    const profile = await metaClient.getUserProfile(userAccessToken);

    // 4. Fetch Permissions
    const permissionsData = await metaClient.getUserPermissions(userAccessToken);
    const grantedPermissions = permissionsData
      .filter((p) => p.status === 'granted')
      .map((p) => p.permission);

    // 5. Fetch Pages
    const pagesData = await metaClient.getUserPages(userAccessToken);
    const encryptedPages: FacebookPage[] = pagesData.map((page) => ({
      id: page.id,
      name: page.name,
      category: page.category || 'Handbag Retail',
      profilePictureUrl: page.picture?.data?.url,
      encryptedPageAccessToken: encryptToken(page.access_token),
      isConnected: true,
      tasks: page.tasks || [],
    }));

    // 6. Fetch Ad Accounts (if ads_management granted)
    let adAccountsData: Array<{
      id: string;
      accountId: string;
      name: string;
      currency: string;
      accountStatus: number;
    }> = [];

    try {
      const fetchedAds = await metaClient.getAdAccounts(userAccessToken);
      adAccountsData = fetchedAds.map((ad) => ({
        id: ad.id,
        accountId: ad.account_id,
        name: ad.name,
        currency: ad.currency || 'USD',
        accountStatus: ad.account_status,
      }));
    } catch (adErr) {
      console.warn('[Facebook Callback] Unable to fetch ad accounts:', adErr);
    }

    const defaultPageId = encryptedPages.length > 0 ? encryptedPages[0].id : undefined;
    const defaultAdAccountId = adAccountsData.length > 0 ? adAccountsData[0].id : undefined;

    const accountRecord: FacebookAccount = {
      userId: profile.id,
      userName: profile.name,
      userEmail: profile.email,
      profilePictureUrl: profile.picture?.data?.url,
      encryptedUserAccessToken: encryptToken(userAccessToken),
      tokenExpiresAt: expiresAt,
      isConnected: true,
      lastConnectedAt: new Date().toISOString(),
      grantedPermissions,
      selectedPageId: defaultPageId,
      pages: encryptedPages,
      adAccounts: adAccountsData,
      selectedAdAccountId: defaultAdAccountId,
    };

    // 7. Persist to Vercel Blob
    await BlobStorageService.putJson(FB_CONFIG_PATH, accountRecord);

    await BlobStorageService.recordActivity({
      actor: profile.name || 'Administrator',
      action: 'FACEBOOK_ACCOUNT_CONNECTED',
      category: 'auth',
      status: 'success',
      details: `Successfully connected Facebook account "${profile.name}" with ${encryptedPages.length} Pages and ${adAccountsData.length} Ad Accounts.`,
      metadata: {
        userId: profile.id,
        pagesCount: encryptedPages.length,
        permissions: grantedPermissions,
      },
    });

    redirectUrl.searchParams.set('success', 'Facebook account connected successfully!');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('fb_oauth_state');
    return response;
  } catch (err: any) {
    console.error('[Facebook OAuth Callback Exception]:', err);
    redirectUrl.searchParams.set('error', err.message || 'Failed to exchange authorization token');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete('fb_oauth_state');
    return response;
  }
}
