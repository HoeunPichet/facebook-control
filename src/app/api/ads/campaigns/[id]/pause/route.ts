import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AdCampaign, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const [campaigns, account] = await Promise.all([
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
  ]);

  const campaign = campaigns.find((c) => c.id === id);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  if (campaign.metaCampaignId && account?.encryptedUserAccessToken) {
    try {
      const userToken = decryptToken(account.encryptedUserAccessToken);
      const metaClient = new MetaApiClient();
      await metaClient.updateCampaignStatus(campaign.metaCampaignId, userToken, 'PAUSED');
    } catch (err: any) {
      console.warn('[Pause Meta Warning]:', err.message);
    }
  }

  const updatedCampaign: AdCampaign = {
    ...campaign,
    status: 'PAUSED',
    lastUpdated: new Date().toISOString(),
  };

  await BlobStorageService.updateJson<AdCampaign[]>(CAMPAIGNS_PATH, (list) => {
    return (list || []).map((c) => (c.id === id ? updatedCampaign : c));
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'CAMPAIGN_PAUSED',
    category: 'ads',
    status: 'info',
    details: `Paused advertising campaign "${campaign.name}".`,
    metadata: { campaignId: id, metaId: campaign.metaCampaignId },
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}

