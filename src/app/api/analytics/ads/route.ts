import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AdCampaign, FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const [campaigns, account] = await Promise.all([
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
  ]);

  return NextResponse.json({
    success: true,
    campaigns,
    adAccount: account?.selectedAdAccountId,
  });
}

