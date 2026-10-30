import { NextRequest, NextResponse } from 'next/server';
import { verifyMetaWebhookSignature } from '@/lib/crypto';
import { BlobStorageService } from '@/lib/storage/blob-storage';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_APP_SECRET || 'cambodia_webhook_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook Verified]');
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden: Invalid webhook verify token', { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // In production, verify SHA-256 HMAC signature
    if (process.env.META_APP_SECRET && signature) {
      const isValid = verifyMetaWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.warn('[Meta Webhook Signature Mismatch]');
        return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 401 });
      }
    }

    const payload = JSON.parse(rawBody);

    // Record activity log for webhook event
    await BlobStorageService.recordActivity({
      actor: 'Meta Webhook',
      action: 'WEBHOOK_EVENT_RECEIVED',
      category: 'cron',
      status: 'info',
      details: `Received Meta webhook event for object: ${payload.object || 'unknown'}`,
      metadata: { object: payload.object, entriesCount: payload.entry?.length || 0 },
    });

    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  } catch (error: any) {
    console.error('[Meta Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 400 }
    );
  }
}

