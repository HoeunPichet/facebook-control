import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/facebook/callback',
  '/api/webhooks/meta',
  '/api/blob/local',
  '/favicon.ico',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, Next internals, and public endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Cron routes verify CRON_SECRET inside their own route handlers
  if (pathname.startsWith('/api/cron')) {
    return NextResponse.next();
  }

  // Check Bearer token in headers (for API requests)
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return NextResponse.next();
  }

  // Check session cookie
  const sessionCookie = request.cookies.get('fb_admin_session');
  if (sessionCookie?.value) {
    return NextResponse.next();
  }

  // If unauthorized API route -> JSON 401
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized: Admin authentication required' },
      { status: 401 }
    );
  }

  // If unauthorized web page -> Redirect to /login
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('redirect', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
