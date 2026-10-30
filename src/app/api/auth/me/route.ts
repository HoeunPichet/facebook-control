import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth.authorized) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      username: 'Administrator',
      role: 'admin',
    },
  });
}

