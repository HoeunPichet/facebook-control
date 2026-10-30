import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';

/**
 * Sanitizes Facebook account data so no encrypted or raw tokens reach frontend JavaScript.
 */
function sanitizeAccountForClient(account: FacebookAccount | null) {
  if (!account) return null;

  const isTokenExpired = account.tokenExpiresAt
    ? new Date(account.tokenExpiresAt).getTime() < Date.now()
    : false;

  return {
    userId: account.userId,
    userName: account.userName,
    userEmail: account.userEmail,
    profilePictureUrl: account.profilePictureUrl,
    isConnected: account.isConnected && !isTokenExpired,
    isTokenExpired,
    tokenExpiresAt: account.tokenExpiresAt,
    lastConnectedAt: account.lastConnectedAt,
    grantedPermissions: account.grantedPermissions,
    selectedPageId: account.selectedPageId,
    selectedAdAccountId: account.selectedAdAccountId,
    pages: account.pages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      profilePictureUrl: p.profilePictureUrl,
      isConnected: p.isConnected,
      tasks: p.tasks,
    })),
    adAccounts: account.adAccounts,
  };
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);
  const sanitized = sanitizeAccountForClient(account);

  return NextResponse.json({
    success: true,
    account: sanitized,
  });
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { selectedPageId, selectedAdAccountId } = body;

    const updated = await BlobStorageService.updateJson<FacebookAccount | null>(
      FB_CONFIG_PATH,
      (current) => {
        if (!current) {
          throw new Error('No Facebook account connected');
        }

        if (selectedPageId) {
          const pageExists = current.pages.some((p) => p.id === selectedPageId);
          if (!pageExists) throw new Error('Selected Page does not belong to this account');
          current.selectedPageId = selectedPageId;
        }

        if (selectedAdAccountId) {
          const adExists = current.adAccounts.some((a) => a.id === selectedAdAccountId);
          if (!adExists) throw new Error('Selected Ad Account does not belong to this account');
          current.selectedAdAccountId = selectedAdAccountId;
        }

        return current;
      },
      null
    );

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'FACEBOOK_SELECTION_UPDATED',
      category: 'auth',
      status: 'info',
      details: `Active Facebook selection updated: Page=${selectedPageId || 'unchanged'}, AdAccount=${selectedAdAccountId || 'unchanged'}`,
    });

    return NextResponse.json({
      success: true,
      account: sanitizeAccountForClient(updated),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update selected page/ad account' },
      { status: 400 }
    );
  }
}

