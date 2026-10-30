import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import {
  FacebookAccount,
  Post,
  AdCampaign,
  AppSettings,
  ActivityLog,
  DashboardSummary,
} from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const DRAFTS_PATH = '/posts/drafts.json';
const SCHEDULED_PATH = '/posts/scheduled.json';
const PUBLISHED_PATH = '/posts/published.json';
const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const SETTINGS_PATH = '/config/app-settings.json';
const LOGS_PATH = '/logs/activity.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const [account, drafts, scheduled, published, campaigns, settings, logs] =
    await Promise.all([
      BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
      BlobStorageService.getJson<Post[]>(DRAFTS_PATH, []),
      BlobStorageService.getJson<Post[]>(SCHEDULED_PATH, []),
      BlobStorageService.getJson<Post[]>(PUBLISHED_PATH, []),
      BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
      BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
      BlobStorageService.getJson<ActivityLog[]>(LOGS_PATH, []),
    ]);

  const selectedPage = account?.pages.find((p) => p.id === account.selectedPageId) || account?.pages[0];

  const failedDrafts = drafts.filter((p) => p.status === 'failed');
  const failedScheduled = scheduled.filter((p) => p.status === 'failed');
  const allFailed = [...failedDrafts, ...failedScheduled];

  const failedTasks = allFailed.map((p) => ({
    id: p.id,
    type: 'Post Publishing',
    description: p.captionKhmer || p.captionEnglish || 'Handbag Post',
    error: p.lastError || 'Unknown Error',
    failedAt: p.updatedAt,
  }));

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');
  const totalDailyAdBudget = activeCampaigns.reduce((sum, c) => sum + c.dailyBudgetUsd, 0);

  const summary: DashboardSummary = {
    connectedPagesCount: account?.pages?.length || 0,
    selectedPage: selectedPage
      ? {
          id: selectedPage.id,
          name: selectedPage.name,
          profilePictureUrl: selectedPage.profilePictureUrl,
        }
      : undefined,
    totalPublishedPosts: published.length,
    scheduledPostsCount: scheduled.filter((p) => p.status === 'scheduled').length,
    draftPostsCount: drafts.filter((p) => p.status === 'draft').length,
    failedPostsCount: allFailed.length,
    activeCampaignsCount: activeCampaigns.length,
    totalAdSpend: totalDailyAdBudget,
    totalImpressions: 0,
    totalReach: 0,
    totalClicks: 0,
    totalMessages: 0,
    avgCostPerMessage: 0,
    currency: settings?.currency || 'USD',
    recentActivities: (logs || []).slice(0, 8),
    failedTasks,
  };

  return NextResponse.json({
    success: true,
    summary,
  });
}

