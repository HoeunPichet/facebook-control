import { z } from 'zod';

// ==========================================
// 1. Application Settings
// ==========================================
export const AppSettingsSchema = z.object({
  themeColor: z.enum(['pink', 'rose', 'indigo', 'purple', 'emerald']).default('pink'),
  businessName: z.string().default('Cambodia Luxury Handbags'),
  currency: z.enum(['USD', 'KHR']).default('USD'),
  timezone: z.string().default('Asia/Phnom_Penh'),
  exchangeRateUsdToKhr: z.number().default(4100),
  dailySpendingLimitUsd: z.number().default(50),
  maxPostRetries: z.number().default(3),
  notificationEmail: z.string().email().optional().or(z.literal('')),
  metaGraphApiVersion: z.string().default('v21.0'),
  updatedAt: z.string().default(() => new Date().toISOString()),
});

export type AppSettings = z.infer<typeof AppSettingsSchema>;

// ==========================================
// 2. Facebook Account & Pages
// ==========================================
export const FacebookPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  encryptedPageAccessToken: z.string(),
  isConnected: z.boolean().default(true),
  tasks: z.array(z.string()).default([]),
});

export type FacebookPage = z.infer<typeof FacebookPageSchema>;

export const FacebookAccountSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string().optional(),
  profilePictureUrl: z.string().optional(),
  encryptedUserAccessToken: z.string(),
  tokenExpiresAt: z.string().optional(),
  isConnected: z.boolean().default(true),
  lastConnectedAt: z.string(),
  grantedPermissions: z.array(z.string()).default([]),
  selectedPageId: z.string().optional(),
  pages: z.array(FacebookPageSchema).default([]),
  adAccounts: z.array(z.object({
    id: z.string(),
    accountId: z.string(),
    name: z.string(),
    currency: z.string().default('USD'),
    accountStatus: z.number().default(1),
  })).default([]),
  selectedAdAccountId: z.string().optional(),
});

export type FacebookAccount = z.infer<typeof FacebookAccountSchema>;

// ==========================================
// 3. Posts & Scheduling
// ==========================================
export const PostStatusSchema = z.enum([
  'draft',
  'scheduled',
  'publishing',
  'published',
  'failed',
  'cancelled'
]);

export type PostStatus = z.infer<typeof PostStatusSchema>;

export const PostSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  captionKhmer: z.string().default(''),
  captionEnglish: z.string().default(''),
  imageUrls: z.array(z.string()).default([]),
  status: PostStatusSchema.default('draft'),
  scheduledPublishTime: z.string().optional(), // ISO string in UTC
  scheduledTimezone: z.string().default('Asia/Phnom_Penh'),
  publishedTime: z.string().optional(),
  facebookPostId: z.string().optional(),
  facebookPermalink: z.string().optional(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  lastError: z.string().optional(),
  idempotencyKey: z.string(),
  tags: z.array(z.string()).default([]),
  productPriceUsd: z.number().optional(),
  productPriceKhr: z.number().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Post = z.infer<typeof PostSchema>;

// ==========================================
// 4. Facebook Advertising
// ==========================================
export const AdCampaignObjectiveSchema = z.enum([
  'OUTCOME_TRAFFIC',
  'OUTCOME_ENGAGEMENT',
  'OUTCOME_MESSAGES',
  'OUTCOME_SALES',
  'OUTCOME_AWARENESS'
]);

export type AdCampaignObjective = z.infer<typeof AdCampaignObjectiveSchema>;

export const AdCampaignSchema = z.object({
  id: z.string(),
  adAccountId: z.string(),
  metaCampaignId: z.string().optional(),
  metaAdSetId: z.string().optional(),
  metaAdId: z.string().optional(),
  name: z.string(),
  objective: AdCampaignObjectiveSchema.default('OUTCOME_MESSAGES'),
  status: z.enum(['ACTIVE', 'PAUSED', 'ARCHIVED']).default('PAUSED'),
  dailyBudgetUsd: z.number().min(1),
  lifetimeBudgetUsd: z.number().optional(),
  adminConfirmed: z.boolean().default(false),
  confirmedAt: z.string().optional(),
  confirmedBy: z.string().optional(),
  targetLocations: z.array(z.string()).default(['Phnom Penh', 'Siem Reap', 'Battambang']),
  ageMin: z.number().min(18).default(18),
  ageMax: z.number().max(65).default(45),
  genders: z.array(z.number()).default([2]), // 1: Male, 2: Female (Handbag audience default female)
  targetInterests: z.array(z.string()).default(['Handbag', 'Fashion accessories', 'Online shopping']),
  creativePostId: z.string().optional(),
  creativeImageUrl: z.string().optional(),
  headline: z.string().optional(),
  bodyText: z.string().optional(),
  createdTime: z.string(),
  lastUpdated: z.string(),
});

export type AdCampaign = z.infer<typeof AdCampaignSchema>;

export const AdInsightSchema = z.object({
  campaignId: z.string(),
  campaignName: z.string(),
  dateStart: z.string(),
  dateStop: z.string(),
  spend: z.number().default(0),
  impressions: z.number().default(0),
  reach: z.number().default(0),
  clicks: z.number().default(0),
  ctr: z.number().default(0),
  cpc: z.number().default(0),
  cpm: z.number().default(0),
  messagesCount: z.number().default(0),
  costPerMessage: z.number().default(0),
  purchasesCount: z.number().default(0),
  costPerPurchase: z.number().default(0),
});

export type AdInsight = z.infer<typeof AdInsightSchema>;

// ==========================================
// 5. Facebook Groups (Policy-Compliant Manual Workflow)
// ==========================================
export const GroupItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
  category: z.string().default('Handbag & Fashion'),
  memberCountEstimate: z.number().optional(),
  postGuidelinesKhmer: z.string().optional(),
  postGuidelinesEnglish: z.string().optional(),
  lastSharedAt: z.string().optional(),
  totalSharesCompleted: z.number().default(0),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export type GroupItem = z.infer<typeof GroupItemSchema>;

export const GroupSharingTaskSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  groupName: z.string(),
  groupUrl: z.string(),
  postId: z.string(),
  postCaption: z.string(),
  postImageUrls: z.array(z.string()).default([]),
  status: z.enum(['pending', 'completed', 'skipped']).default('pending'),
  scheduledFor: z.string().optional(),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
});

export type GroupSharingTask = z.infer<typeof GroupSharingTaskSchema>;

// ==========================================
// 6. Activity & Audit Logs
// ==========================================
export const ActivityLogSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.string().default('Administrator'),
  action: z.string(),
  category: z.enum(['auth', 'posts', 'ads', 'groups', 'cron', 'settings']),
  status: z.enum(['success', 'warning', 'error', 'info']),
  details: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ActivityLog = z.infer<typeof ActivityLogSchema>;

// ==========================================
// 7. Dashboard Overview Summary
// ==========================================
export interface DashboardSummary {
  connectedPagesCount: number;
  selectedPage?: {
    id: string;
    name: string;
    profilePictureUrl?: string;
  };
  totalPublishedPosts: number;
  scheduledPostsCount: number;
  draftPostsCount: number;
  failedPostsCount: number;
  activeCampaignsCount: number;
  totalAdSpend: number;
  totalImpressions: number;
  totalReach: number;
  totalClicks: number;
  totalMessages: number;
  avgCostPerMessage: number;
  currency: string;
  recentActivities: ActivityLog[];
  failedTasks: Array<{
    id: string;
    type: string;
    description: string;
    error: string;
    failedAt: string;
  }>;
}

