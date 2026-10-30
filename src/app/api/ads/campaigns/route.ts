import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AdCampaign, AdCampaignSchema, FacebookAccount, AppSettings } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const SETTINGS_PATH = '/config/app-settings.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const [campaigns, account, settings] = await Promise.all([
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
    BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
  ]);

  return NextResponse.json({
    success: true,
    campaigns,
    selectedAdAccountId: account?.selectedAdAccountId,
    dailySpendingLimitUsd: settings?.dailySpendingLimitUsd || 50,
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const [account, settings] = await Promise.all([
      BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
      BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
    ]);

    if (!account || !account.selectedAdAccountId) {
      return NextResponse.json(
        { error: 'No Meta Ad Account selected. Please configure one in Facebook Accounts.' },
        { status: 400 }
      );
    }

    const dailyBudget = Number(body.dailyBudgetUsd || 10);
    const spendingLimit = settings?.dailySpendingLimitUsd || 50;

    // Safety limit check
    if (dailyBudget > spendingLimit) {
      return NextResponse.json(
        {
          error: `Daily budget ($${dailyBudget}) exceeds your safety spending threshold ($${spendingLimit}/day). Please adjust the budget or update the limit in Settings.`,
        },
        { status: 400 }
      );
    }

    const campaignId = `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    let metaCampaignId: string | undefined = undefined;

    // Attempt to register on Meta Marketing API in PAUSED status if connected
    if (account.encryptedUserAccessToken && account.selectedAdAccountId) {
      try {
        const userToken = decryptToken(account.encryptedUserAccessToken);
        const metaClient = new MetaApiClient();
        const metaRes = await metaClient.createCampaign(
          account.selectedAdAccountId,
          userToken,
          {
            name: body.name || `Handbag Campaign - ${new Date().toLocaleDateString()}`,
            objective: body.objective || 'OUTCOME_MESSAGES',
            status: 'PAUSED',
            daily_budget: Math.round(dailyBudget * 100), // Meta takes budget in cents
          }
        );
        metaCampaignId = metaRes.id;
      } catch (metaErr: any) {
        console.warn('[Meta Create Campaign Warning]:', metaErr.message);
        // Continue creating campaign config locally so administrator can review/debug
      }
    }

    const newCampaign: AdCampaign = AdCampaignSchema.parse({
      id: campaignId,
      adAccountId: account.selectedAdAccountId,
      metaCampaignId,
      name: body.name || 'Cambodia Handbag Messenger Promotion',
      objective: body.objective || 'OUTCOME_MESSAGES',
      status: 'PAUSED', // Always starts in PAUSED until explicit admin launch confirmation
      dailyBudgetUsd: dailyBudget,
      adminConfirmed: false,
      targetLocations: body.targetLocations || ['Phnom Penh', 'Siem Reap', 'Battambang'],
      ageMin: body.ageMin ? Number(body.ageMin) : 18,
      ageMax: body.ageMax ? Number(body.ageMax) : 45,
      genders: body.genders || [2], // 2 = Female default
      targetInterests: body.targetInterests || ['Handbag', 'Fashion accessories', 'Online shopping'],
      creativePostId: body.creativePostId,
      creativeImageUrl: body.creativeImageUrl,
      headline: body.headline || 'Luxury Handbag Online Delivery',
      bodyText: body.bodyText || 'Order now via Messenger with free delivery in Phnom Penh!',
      createdTime: nowIso,
      lastUpdated: nowIso,
    });

    await BlobStorageService.updateJson<AdCampaign[]>(
      CAMPAIGNS_PATH,
      (list) => [newCampaign, ...(list || [])],
      []
    );

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'CAMPAIGN_CREATED',
      category: 'ads',
      status: 'info',
      details: `Created campaign "${newCampaign.name}" with daily budget $${dailyBudget}. Meta ID: ${metaCampaignId || 'Draft'}. Status: PAUSED.`,
      metadata: { campaignId, metaCampaignId, dailyBudget },
    });

    return NextResponse.json({ success: true, campaign: newCampaign });
  } catch (error: any) {
    console.error('[Create Campaign Error]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create campaign' },
      { status: 400 }
    );
  }
}

