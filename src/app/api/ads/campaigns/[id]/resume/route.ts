import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AdCampaign, FacebookAccount, AppSettings } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const SETTINGS_PATH = '/config/app-settings.json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (!body.adminConfirmed) {
    return NextResponse.json(
      {
        error: 'Administrator confirmation is required before resuming a live advertising campaign.',
        requiresConfirmation: true,
      },
      { status: 400 }
    );
  }

  const [campaigns, account, settings] = await Promise.all([
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
    BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
  ]);

  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const spendingLimit = settings?.dailySpendingLimitUsd || 50;
  if (campaign.dailyBudgetUsd > spendingLimit) {
    return NextResponse.json(
      {
        error: `Cannot resume: Campaign budget ($${campaign.dailyBudgetUsd}) exceeds safety threshold ($${spendingLimit}/day).`,
      },
      { status: 400 }
    );
  }

  if (campaign.metaCampaignId && account?.encryptedUserAccessToken) {
    try {
      const userToken = decryptToken(account.encryptedUserAccessToken);
      const metaClient = new MetaApiClient();
      await metaClient.updateCampaignStatus(campaign.metaCampaignId, userToken, 'ACTIVE');
    } catch (metaErr: any) {
      return NextResponse.json(
        { error: `Meta API rejected resume: ${metaErr.message}` },
        { status: 500 }
      );
    }
  }

  const updatedCampaign: AdCampaign = {
    ...campaign,
    status: 'ACTIVE',
    lastUpdated: new Date().toISOString(),
  };

  await BlobStorageService.updateJson<AdCampaign[]>(CAMPAIGNS_PATH, (list) => {
    return (list || []).map((c) => (c.id === id ? updatedCampaign : c));
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'CAMPAIGN_RESUMED',
    category: 'ads',
    status: 'success',
    details: `Administrator confirmed and resumed advertising campaign "${campaign.name}". Status: ACTIVE.`,
    metadata: { campaignId: id, metaId: campaign.metaCampaignId },
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}

