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
        error: 'Administrator confirmation is strictly required to launch a live advertising campaign.',
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

  // Safety Spending Limit Check
  const spendingLimit = settings?.dailySpendingLimitUsd || 50;
  if (campaign.dailyBudgetUsd > spendingLimit) {
    return NextResponse.json(
      {
        error: `Cannot launch: Daily budget ($${campaign.dailyBudgetUsd}) exceeds safety limit ($${spendingLimit}/day).`,
      },
      { status: 400 }
    );
  }

  // If campaign has Meta Campaign ID, activate it on Meta
  if (campaign.metaCampaignId && account?.encryptedUserAccessToken) {
    try {
      const userToken = decryptToken(account.encryptedUserAccessToken);
      const metaClient = new MetaApiClient();
      await metaClient.updateCampaignStatus(campaign.metaCampaignId, userToken, 'ACTIVE');
    } catch (metaErr: any) {
      console.error('[Launch Meta Error]:', metaErr);
      return NextResponse.json(
        { error: `Meta API rejected launch: ${metaErr.message}` },
        { status: 500 }
      );
    }
  }

  const updatedCampaign: AdCampaign = {
    ...campaign,
    status: 'ACTIVE',
    adminConfirmed: true,
    confirmedAt: new Date().toISOString(),
    confirmedBy: 'Administrator',
    lastUpdated: new Date().toISOString(),
  };

  await BlobStorageService.updateJson<AdCampaign[]>(CAMPAIGNS_PATH, (list) => {
    return (list || []).map((c) => (c.id === id ? updatedCampaign : c));
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'CAMPAIGN_LAUNCHED',
    category: 'ads',
    status: 'success',
    details: `Administrator confirmed and launched campaign "${campaign.name}" with daily budget $${campaign.dailyBudgetUsd}. Status: ACTIVE.`,
    metadata: { campaignId: id, budget: campaign.dailyBudgetUsd, metaId: campaign.metaCampaignId },
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}

