import { NextRequest, NextResponse } from 'next/server';
import { MetaApiClient } from '@/lib/meta/client';
import { generateOAuthState } from '@/lib/crypto';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // Ensure administrator is initiating connection
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
  const redirectUri = process.env.META_REDIRECT_URI || `${protocol}://${host}/api/facebook/callback`;

  const state = generateOAuthState();
  const metaClient = new MetaApiClient();
  const authUrl = metaClient.getAuthorizationUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  
  // Store OAuth state in a secure cookie for CSRF validation during callback
  response.cookies.set('fb_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600, // 10 minutes
    path: '/',
  });

  return response;
}

