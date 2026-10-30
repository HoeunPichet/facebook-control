import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { ActivityLog } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const LOGS_PATH = '/logs/activity.json';

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const status = searchParams.get('status');

  const logs = await BlobStorageService.getJson<ActivityLog[]>(LOGS_PATH, []);

  let filtered = [...logs];
  if (category && category !== 'all') {
    filtered = filtered.filter((l) => l.category === category);
  }
  if (status && status !== 'all') {
    filtered = filtered.filter((l) => l.status === status);
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    logs: filtered,
  });
}

