import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { FacebookAccount } from '@/lib/types';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';
import { verifySessionToken } from '@/lib/auth';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const ANALYTICS_PATH = '/analytics/daily-reports.json';

function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;

  const { searchParams } = new URL(request.url);
  if (cronSecret && searchParams.get('secret') === cronSecret) return true;

  const sessionCookie = request.cookies.get('fb_admin_session')?.value;
  if (sessionCookie && verifySessionToken(sessionCookie).valid) return true;

  return false;
}

export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET or session' }, { status: 401 });
  }

  try {
    const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);
    if (!account || !account.selectedAdAccountId) {
      return NextResponse.json({
        success: true,
        message: 'No Ad Account configured for analytics sync.',
      });
    }

    const userToken = decryptToken(account.encryptedUserAccessToken);
    const metaClient = new MetaApiClient();

    const insights = await metaClient.getAdAccountInsights(
      account.selectedAdAccountId,
      userToken,
      'last_30d'
    );

    const report = {
      syncedAt: new Date().toISOString(),
      adAccountId: account.selectedAdAccountId,
      insights,
    };

    await BlobStorageService.putJson(ANALYTICS_PATH, report);

    await BlobStorageService.recordActivity({
      actor: 'Vercel Cron Worker',
      action: 'ANALYTICS_SYNCED',
      category: 'cron',
      status: 'info',
      details: `Synchronized Meta Marketing API insights for ad account ${account.selectedAdAccountId} (${insights.length} campaign records).`,
    });

    return NextResponse.json({ success: true, count: insights.length, report });
  } catch (error: any) {
    console.error('[Sync Analytics Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Analytics sync failed' },
      { status: 500 }
    );
  }
}

