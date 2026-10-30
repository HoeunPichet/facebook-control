import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { FacebookAccount, AppSettings } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';
import { MetaApiClient } from '@/lib/meta/client';
import { decryptToken } from '@/lib/crypto';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';
const SETTINGS_PATH = '/config/app-settings.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const [account, settings] = await Promise.all([
    BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null),
    BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
  ]);

  if (!account) {
    return NextResponse.json({ success: true, adAccounts: [], selectedAdAccountId: null });
  }

  // If accounts are empty or need refresh from Meta
  let adAccounts = account.adAccounts || [];

  if (adAccounts.length === 0 && account.encryptedUserAccessToken) {
    try {
      const userToken = decryptToken(account.encryptedUserAccessToken);
      const metaClient = new MetaApiClient();
      const fetched = await metaClient.getAdAccounts(userToken);
      adAccounts = fetched.map((ad) => ({
        id: ad.id,
        accountId: ad.account_id,
        name: ad.name,
        currency: ad.currency || 'USD',
        accountStatus: ad.account_status,
      }));

      // Update in stored accounts
      await BlobStorageService.updateJson<FacebookAccount | null>(FB_CONFIG_PATH, (current) => {
        if (!current) return current;
        current.adAccounts = adAccounts;
        if (!current.selectedAdAccountId && adAccounts.length > 0) {
          current.selectedAdAccountId = adAccounts[0].id;
        }
        return current;
      }, account);
    } catch (err) {
      console.warn('[Ads Accounts Error]:', err);
    }
  }

  return NextResponse.json({
    success: true,
    adAccounts,
    selectedAdAccountId: account.selectedAdAccountId || (adAccounts[0]?.id ?? null),
    dailySpendingLimitUsd: settings?.dailySpendingLimitUsd || 50,
  });
}

