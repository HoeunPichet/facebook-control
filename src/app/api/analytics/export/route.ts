import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { Post, AdCampaign, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const PUBLISHED_PATH = '/posts/published.json';
const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'campaigns'; // 'campaigns' | 'posts'

  if (type === 'posts') {
    const posts = await BlobStorageService.getJson<Post[]>(PUBLISHED_PATH, []);

    const headers = ['Post ID', 'Facebook Post ID', 'Published Date', 'Status', 'Price USD', 'Price KHR', 'Khmer Caption', 'English Caption', 'Permalink'];
    const rows = posts.map((p) => [
      `"${p.id}"`,
      `"${p.facebookPostId || ''}"`,
      `"${p.publishedTime || p.createdAt}"`,
      `"${p.status}"`,
      `"${p.productPriceUsd || ''}"`,
      `"${p.productPriceKhr || ''}"`,
      `"${(p.captionKhmer || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${(p.captionEnglish || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
      `"${p.facebookPermalink || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="handbag-posts-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } else {
    const [campaigns, account] = await Promise.all([
      BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
      BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
    ]);

    let insightsMap = new Map<string, any>();
    if (account?.selectedAdAccountId && account?.encryptedUserAccessToken) {
      try {
        const userToken = decryptToken(account.encryptedUserAccessToken);
        const metaClient = new MetaApiClient();
        const insights = await metaClient.getAdAccountInsights(account.selectedAdAccountId, userToken, 'last_30d');
        for (const item of insights) {
          insightsMap.set(item.campaign_id, item);
        }
      } catch {
        // ignore
      }
    }

    const headers = ['Campaign ID', 'Meta Campaign ID', 'Campaign Name', 'Objective', 'Status', 'Daily Budget USD', 'Spend USD', 'Impressions', 'Reach', 'Clicks', 'CTR %', 'CPC USD', 'Target Locations', 'Created Date'];
    const rows = campaigns.map((c) => {
      const ins = c.metaCampaignId ? insightsMap.get(c.metaCampaignId) : null;
      return [
        `"${c.id}"`,
        `"${c.metaCampaignId || 'N/A'}"`,
        `"${c.name.replace(/"/g, '""')}"`,
        `"${c.objective}"`,
        `"${c.status}"`,
        `"${c.dailyBudgetUsd}"`,
        `"${ins ? ins.spend : '0.00'}"`,
        `"${ins ? ins.impressions : '0'}"`,
        `"${ins ? ins.reach : '0'}"`,
        `"${ins ? ins.clicks : '0'}"`,
        `"${ins && ins.ctr ? ins.ctr : '0.00'}"`,
        `"${ins && ins.cpc ? ins.cpc : '0.00'}"`,
        `"${c.targetLocations.join('; ')}"`,
        `"${c.createdTime}"`,
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="handbag-ads-report-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  }
}

