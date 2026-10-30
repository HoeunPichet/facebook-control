import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { authenticateRequest } from '@/lib/auth';
import { FacebookAccount } from '@/lib/types';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const currentAccount = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);

    // Overwrite with empty / disconnected state
    await BlobStorageService.putJson(FB_CONFIG_PATH, null);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'FACEBOOK_ACCOUNT_DISCONNECTED',
      category: 'auth',
      status: 'warning',
      details: currentAccount?.userName
        ? `Disconnected Facebook account "${currentAccount.userName}". Stored tokens wiped.`
        : 'Facebook account disconnected.',
    });

    return NextResponse.json({
      success: true,
      message: 'Facebook account disconnected successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to disconnect account' },
      { status: 500 }
    );
  }
}

