import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { FacebookAccount, AdCampaign } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const ANALYTICS_PATH = '/analytics/daily-reports.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const datePreset = searchParams.get('datePreset') || 'last_30d';

  const [account, campaigns, cachedReport] = await Promise.all([
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
    BlobStorageService.getJson<any>(ANALYTICS_PATH, null),
  ]);

  if (!account || !account.selectedAdAccountId) {
    return NextResponse.json({
      success: true,
      insights: [],
      totals: { spend: 0, impressions: 0, reach: 0, clicks: 0, messages: 0 },
      isLive: false,
    });
  }

  // Attempt to fetch fresh insights from Meta
  if (account.encryptedUserAccessToken) {
    try {
      const userToken = decryptToken(account.encryptedUserAccessToken);
      const metaClient = new MetaApiClient();
      const metaInsights = await metaClient.getAdAccountInsights(
        account.selectedAdAccountId,
        userToken,
        datePreset
      );

      const parsedInsights = metaInsights.map((item) => {
        const messagesAction = item.actions?.find(
          (a) => a.action_type === 'onsite_conversion.messaging_conversation_started_7d' || a.action_type.includes('message')
        );
        const messagesCount = messagesAction ? parseInt(messagesAction.value, 10) : 0;
        const spend = parseFloat(item.spend) || 0;
        const impressions = parseInt(item.impressions, 10) || 0;
        const reach = parseInt(item.reach, 10) || 0;
        const clicks = parseInt(item.clicks, 10) || 0;
        const cpc = item.cpc ? parseFloat(item.cpc) : clicks > 0 ? spend / clicks : 0;
        const cpm = item.cpm ? parseFloat(item.cpm) : impressions > 0 ? (spend / impressions) * 1000 : 0;
        const ctr = item.ctr ? parseFloat(item.ctr) : impressions > 0 ? (clicks / impressions) * 100 : 0;
        const costPerMessage = messagesCount > 0 ? spend / messagesCount : 0;

        return {
          campaignId: item.campaign_id,
          campaignName: item.campaign_name,
          dateStart: item.date_start,
          dateStop: item.date_stop,
          spend,
          impressions,
          reach,
          clicks,
          ctr,
          cpc,
          cpm,
          messagesCount,
          costPerMessage,
        };
      });

      const totals = parsedInsights.reduce(
        (acc, cur) => ({
          spend: acc.spend + cur.spend,
          impressions: acc.impressions + cur.impressions,
          reach: acc.reach + cur.reach,
          clicks: acc.clicks + cur.clicks,
          messages: acc.messages + cur.messagesCount,
        }),
        { spend: 0, impressions: 0, reach: 0, clicks: 0, messages: 0 }
      );

      return NextResponse.json({
        success: true,
        insights: parsedInsights,
        totals,
        isLive: true,
      });
    } catch (metaErr: any) {
      console.warn('[Ads Insights Warning]:', metaErr.message);
    }
  }

  // Fallback to cached reports if Meta API query fails or token unavailable
  const cachedInsights = cachedReport?.insights || [];
  return NextResponse.json({
    success: true,
    insights: cachedInsights,
    totals: { spend: 0, impressions: 0, reach: 0, clicks: 0, messages: 0 },
    isLive: false,
  });
}

