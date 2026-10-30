import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { FacebookAccount } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const FB_CONFIG_PATH = '/config/facebook-accounts.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const account = await BlobStorageService.getJson<FacebookAccount | null>(FB_CONFIG_PATH, null);

  if (!account || !account.pages) {
    return NextResponse.json({ success: true, pages: [], selectedPageId: null });
  }

  // Return pages without encrypted tokens
  const pages = account.pages.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    profilePictureUrl: p.profilePictureUrl,
    isConnected: p.isConnected,
    tasks: p.tasks,
    isSelected: p.id === account.selectedPageId,
  }));

  return NextResponse.json({
    success: true,
    pages,
    selectedPageId: account.selectedPageId,
  });
}

