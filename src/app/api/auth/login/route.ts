import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { BlobStorageService } from '@/lib/storage/blob-storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    const expectedPassword = process.env.ADMIN_PASSWORD || 'admin1234';

    if (!password || password !== expectedPassword) {
      await BlobStorageService.recordActivity({
        actor: 'Unknown',
        action: 'ADMIN_LOGIN_FAILED',
        category: 'auth',
        status: 'warning',
        details: 'Failed login attempt with incorrect admin password.',
      });

      return NextResponse.json(
        { success: false, error: 'Invalid administrator credentials' },
        { status: 401 }
      );
    }

    const token = createSessionToken('admin');
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      user: { role: 'admin', username: 'Administrator' }
    });

    setSessionCookie(response, token);

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'ADMIN_LOGIN_SUCCESS',
      category: 'auth',
      status: 'success',
      details: 'Administrator successfully logged in.',
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to authenticate' },
      { status: 500 }
    );
  }
}

