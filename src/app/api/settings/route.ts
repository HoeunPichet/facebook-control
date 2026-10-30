import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AppSettings, AppSettingsSchema } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const SETTINGS_BLOB_PATH = '/config/app-settings.json';

const DEFAULT_SETTINGS: AppSettings = {
  themeColor: 'pink',
  businessName: 'Cambodia Luxury Handbags',
  currency: 'USD',
  timezone: 'Asia/Phnom_Penh',
  exchangeRateUsdToKhr: 4100,
  dailySpendingLimitUsd: 50,
  maxPostRetries: 3,
  notificationEmail: '',
  metaGraphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
  updatedAt: new Date().toISOString(),
};

export async function GET() {
  try {
    const settings = await BlobStorageService.getJson<AppSettings>(
      SETTINGS_BLOB_PATH,
      DEFAULT_SETTINGS
    );
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return NextResponse.json({ success: true, settings: DEFAULT_SETTINGS });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await BlobStorageService.updateJson<AppSettings>(
      SETTINGS_BLOB_PATH,
      (current) => {
        const merged = {
          ...DEFAULT_SETTINGS,
          ...(current || {}),
          ...body,
          updatedAt: new Date().toISOString(),
        };
        return AppSettingsSchema.parse(merged);
      },
      DEFAULT_SETTINGS
    );

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'SETTINGS_UPDATED',
      category: 'settings',
      status: 'info',
      details: 'Application and marketing safety settings were updated.',
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update settings' },
      { status: 400 }
    );
  }
}

