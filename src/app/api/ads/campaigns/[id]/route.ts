import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { AdCampaign, AppSettings } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const CAMPAIGNS_PATH = '/campaigns/campaign-config.json';
const SETTINGS_PATH = '/config/app-settings.json';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const campaigns = await BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []);
  const campaign = campaigns.find((c) => c.id === id);

  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, campaign });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const [settings, campaigns] = await Promise.all([
    BlobStorageService.getJson<AppSettings | null>(SETTINGS_PATH, null),
    BlobStorageService.getJson<AdCampaign[]>(CAMPAIGNS_PATH, []),
  ]);

  const target = campaigns.find((c) => c.id === id);
  if (!target) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  // Budget increase safety validation
  if (body.dailyBudgetUsd) {
    const newBudget = Number(body.dailyBudgetUsd);
    const spendingLimit = settings?.dailySpendingLimitUsd || 50;

    if (newBudget > spendingLimit) {
      return NextResponse.json(
        {
          error: `Budget $${newBudget} exceeds safety spending limit ($${spendingLimit}/day).`,
        },
        { status: 400 }
      );
    }

    if (newBudget > target.dailyBudgetUsd && !body.adminConfirmed) {
      return NextResponse.json(
        {
          error: 'Increasing the advertising budget requires explicit administrator confirmation.',
          requiresConfirmation: true,
        },
        { status: 400 }
      );
    }
  }

  let updatedCampaign: AdCampaign | null = null;

  await BlobStorageService.updateJson<AdCampaign[]>(CAMPAIGNS_PATH, (list) => {
    return (list || []).map((c) => {
      if (c.id === id) {
        const merged: AdCampaign = {
          ...c,
          ...body,
          lastUpdated: new Date().toISOString(),
        };
        updatedCampaign = merged;
        return merged;
      }
      return c;
    });
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'CAMPAIGN_MODIFIED',
    category: 'ads',
    status: 'info',
    details: `Updated campaign settings for "${target.name}".`,
    metadata: { campaignId: id, changes: body },
  });

  return NextResponse.json({ success: true, campaign: updatedCampaign });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const { id } = await params;
  await BlobStorageService.updateJson<AdCampaign[]>(CAMPAIGNS_PATH, (list) => {
    return (list || []).filter((c) => c.id !== id);
  }, []);

  await BlobStorageService.recordActivity({
    actor: 'Administrator',
    action: 'CAMPAIGN_DELETED',
    category: 'ads',
    status: 'info',
    details: `Deleted campaign "${id}".`,
  });

  return NextResponse.json({ success: true, message: 'Campaign deleted successfully' });
}

