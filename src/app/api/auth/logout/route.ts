import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { BlobStorageService } from '@/lib/storage/blob-storage';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  clearSessionCookie(response);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'ADMIN_LOGOUT',
    category: 'auth',
    status: 'info',
    details: 'Administrator logged out.',
  });

  return response;
}

