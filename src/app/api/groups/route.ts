import { NextRequest, NextResponse } from 'next/server';
import { BlobStorageService } from '@/lib/storage/blob-storage';
import { GroupItem, GroupItemSchema } from '@/lib/types';
import { authenticateRequest } from '@/lib/auth';

const GROUPS_PATH = '/groups/group-list.json';

// Pre-seeded Cambodian shopping groups if empty
const DEFAULT_GROUPS: GroupItem[] = [
  {
    id: 'grp_kh_1',
    name: 'Cambodia Online Shopping & Handbag Club',
    url: 'https://www.facebook.com/groups/cambodiashoppingonline',
    category: 'Handbag & Fashion',
    memberCountEstimate: 45000,
    postGuidelinesKhmer: 'អនុញ្ញាតឱ្យផុសលក់កាបូប និងម៉ូដសម្លៀកបំពាក់ស្រី្ត។ ហាមផុសសារដដែលៗលើសពី ២ ដងក្នុងមួយថ្ងៃ។',
    postGuidelinesEnglish: 'Allowed to post luxury bags & female apparel. Max 2 posts per day.',
    totalSharesCompleted: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp_kh_2',
    name: 'ផ្សារកាបូបនារី រាជធានីភ្នំពេញ (Phnom Penh Bags)',
    url: 'https://www.facebook.com/groups/phnompenhfashionbags',
    category: 'Local Buy & Sell',
    memberCountEstimate: 32000,
    postGuidelinesKhmer: 'ដាក់តម្លៃច្បាស់លាស់ និងទីតាំងដឹកជញ្ជូន។',
    postGuidelinesEnglish: 'Include price in USD/KHR and delivery info.',
    totalSharesCompleted: 0,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp_kh_3',
    name: 'Siem Reap & Provinces Online Handbags',
    url: 'https://www.facebook.com/groups/siemreaponlineshopping',
    category: 'Provincial Delivery',
    memberCountEstimate: 18500,
    postGuidelinesKhmer: 'បញ្ជាក់សេវាផ្ញើតាមឡានក្រុង ឬវីរៈប៊ុនថាំ។',
    postGuidelinesEnglish: 'Specify provincial bus shipping fee (Vireak Buntham).',
    totalSharesCompleted: 0,
    createdAt: new Date().toISOString(),
  },
];

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const groups = await BlobStorageService.getJson<GroupItem[]>(GROUPS_PATH, DEFAULT_GROUPS);

  // If was empty initially, save default catalog
  if (groups.length === 0) {
    await BlobStorageService.putJson(GROUPS_PATH, DEFAULT_GROUPS);
    return NextResponse.json({ success: true, groups: DEFAULT_GROUPS });
  }

  return NextResponse.json({ success: true, groups });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newGroup = GroupItemSchema.parse({
      id,
      name: body.name,
      url: body.url,
      category: body.category || 'Handbag & Fashion',
      memberCountEstimate: body.memberCountEstimate ? Number(body.memberCountEstimate) : undefined,
      postGuidelinesKhmer: body.postGuidelinesKhmer || '',
      postGuidelinesEnglish: body.postGuidelinesEnglish || '',
      totalSharesCompleted: 0,
      createdAt: new Date().toISOString(),
    });

    const updatedList = await BlobStorageService.updateJson<GroupItem[]>(
      GROUPS_PATH,
      (list) => [newGroup, ...(list || [])],
      DEFAULT_GROUPS
    );

    await BlobStorageService.recordActivity({
      actor: 'Administrator',
      action: 'GROUP_ADDED',
      category: 'groups',
      status: 'info',
      details: `Added Facebook Group "${newGroup.name}" to directory.`,
    });

    return NextResponse.json({ success: true, group: newGroup });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add group' },
      { status: 400 }
    );
  }
}

