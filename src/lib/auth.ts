import crypto from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'fb_admin_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSessionSecret(): string {
  return process.env.SESSION_SECRET || 'default-cambodia-marketing-session-secret-key-32chars!';
}

/**
 * Creates a signed session token containing timestamp and username.
 */
export function createSessionToken(username: string = 'admin'): string {
  const payload = JSON.stringify({
    username,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  });

  const encodedPayload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  return `${encodedPayload}.${signature}`;
}

/**
 * Verifies the validity of a signed session token.
 */
export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  if (!token) return { valid: false };

  const parts = token.split('.');
  if (parts.length !== 2) return { valid: false };

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');

  try {
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
    if (!isMatch) return { valid: false };

    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) {
      return { valid: false };
    }

    return { valid: true, username: payload.username };
  } catch {
    return { valid: false };
  }
}

/**
 * Validates request authentication for route handlers.
 * Checks for session cookie or Bearer admin token.
 */
export async function authenticateRequest(request: NextRequest): Promise<{ authorized: boolean; error?: string }> {
  // 1. Check Bearer Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    // Allow CRON_SECRET for cron routes
    if (process.env.CRON_SECRET && token === process.env.CRON_SECRET) {
      return { authorized: true };
    }
    // Allow Admin password or signed token
    if (process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD) {
      return { authorized: true };
    }
    const tokenCheck = verifySessionToken(token);
    if (tokenCheck.valid) {
      return { authorized: true };
    }
  }

  // 2. Check HTTP-only cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    const check = verifySessionToken(sessionCookie.value);
    if (check.valid) {
      return { authorized: true };
    }
  }

  return { authorized: false, error: 'Unauthorized: Administrator authentication required' };
}

/**
 * Sets session cookie on an outgoing response.
 */
export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/**
 * Clears session cookie on an outgoing response.
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete(SESSION_COOKIE_NAME);
}

