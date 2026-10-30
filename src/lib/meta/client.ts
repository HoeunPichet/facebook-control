export interface MetaApiErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export class MetaApiError extends Error {
  code: number;
  subcode?: number;
  errorType: string;
  fbtraceId?: string;

  constructor(error: MetaApiErrorResponse['error']) {
    super(error.message);
    this.name = 'MetaApiError';
    this.code = error.code;
    this.subcode = error.error_subcode;
    this.errorType = error.type;
    this.fbtraceId = error.fbtrace_id;
  }
}

export class MetaApiClient {
  private version: string;
  private baseUrl: string;

  constructor(version?: string) {
    this.version = version || process.env.META_GRAPH_API_VERSION || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.version}`;
  }

  public getApiVersion(): string {
    return this.version;
  }

  /**
   * Helper to build full URL with query parameters.
   */
  private buildUrl(endpoint: string, params: Record<string, string | number | boolean | undefined> = {}): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${cleanEndpoint}`);

    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.set(key, String(val));
      }
    }
    return url.toString();
  }

  /**
   * Centralized HTTP request handler with automatic retry for rate limits & transient 5xx errors.
   */
  public async request<T>(
    endpoint: string,
    options: RequestInit = {},
    params: Record<string, string | number | boolean | undefined> = {},
    retries = 3
  ): Promise<T> {
    const url = this.buildUrl(endpoint, params);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        });

        // Inspect rate limit headers
        const appUsage = response.headers.get('x-app-usage');
        if (appUsage) {
          try {
            const usage = JSON.parse(appUsage);
            if (usage.call_count > 80 || usage.total_time > 80) {
              console.warn('[MetaApi] Warning: High API rate usage detected:', usage);
            }
          } catch {
            // ignore JSON parse error on header
          }
        }

        const data = await response.json();

        if (!response.ok || (data && data.error)) {
          const metaError = data.error as MetaApiErrorResponse['error'];
          
          // Check if rate limited (Code 4, 17, 613) or transient server error (1, 2)
          const isRetryable = [1, 2, 4, 17, 613].includes(metaError.code) || response.status >= 500;
          if (isRetryable && attempt < retries) {
            const delayMs = Math.pow(2, attempt) * 1000;
            console.warn(`[MetaApi] Transient error (${metaError.code}: ${metaError.message}). Retrying in ${delayMs}ms...`);
            await new Promise((res) => setTimeout(res, delayMs));
            continue;
          }

          throw new MetaApiError(metaError);
        }

        return data as T;
      } catch (err: unknown) {
        if (err instanceof MetaApiError) {
          throw err;
        }

        // Network failure
        if (attempt < retries) {
          const delayMs = Math.pow(2, attempt) * 1000;
          console.warn(`[MetaApi] Network failure. Retrying in ${delayMs}ms...`, err);
          await new Promise((res) => setTimeout(res, delayMs));
          continue;
        }

        throw err;
      }
    }

    throw new Error(`Meta API request failed after ${retries} attempts`);
  }

  // ==========================================
  // OAuth & Token Exchange
  // ==========================================

  /**
   * Generates Meta OAuth Authorization URL.
   */
  public getAuthorizationUrl(redirectUri: string, state: string): string {
    const appId = process.env.META_APP_ID || '';
    const scopes = [
      'pages_show_list',
      'pages_read_engagement',
      'pages_manage_posts',
      'pages_read_user_content',
      'ads_management',
      'ads_read',
      'business_management',
      'public_profile',
    ].join(',');

    return `https://www.facebook.com/${this.version}/dialog/oauth?client_id=${encodeURIComponent(
      appId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(
      state
    )}&scope=${encodeURIComponent(scopes)}&response_type=code`;
  }

  /**
   * Exchanges authorization code for a short-lived user access token,
   * then exchanges it for a 60-day long-lived access token.
   */
  public async exchangeCodeForLongLivedToken(
    code: string,
    redirectUri: string
  ): Promise<{ accessToken: string; expiresIn: number }> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error('META_APP_ID and META_APP_SECRET must be configured');
    }

    // Step 1: Exchange code for short-lived token
    const shortLivedRes = await this.request<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
      method: 'GET',
    }, {
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });

    const shortToken = shortLivedRes.access_token;

    // Step 2: Exchange for long-lived user token (valid ~60 days)
    const longLivedRes = await this.request<{ access_token: string; expires_in?: number }>('/oauth/access_token', {
      method: 'GET',
    }, {
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortToken,
    });

    return {
      accessToken: longLivedRes.access_token,
      expiresIn: longLivedRes.expires_in || 5184000, // 60 days in seconds
    };
  }

  /**
   * Inspects user profile details.
   */
  public async getUserProfile(accessToken: string): Promise<{ id: string; name: string; email?: string; picture?: { data: { url: string } } }> {
    return this.request('/me', { method: 'GET' }, {
      access_token: accessToken,
      fields: 'id,name,email,picture.width(200).height(200)',
    });
  }

  /**
   * Inspects permissions granted by the user.
   */
  public async getUserPermissions(accessToken: string): Promise<Array<{ permission: string; status: 'granted' | 'declined' }>> {
    const res = await this.request<{ data: Array<{ permission: string; status: 'granted' | 'declined' }> }>('/me/permissions', {
      method: 'GET',
    }, {
      access_token: accessToken,
    });
    return res.data || [];
  }

  /**
   * Retrieves accessible Facebook Pages with long-lived Page tokens.
   */
  public async getUserPages(accessToken: string): Promise<Array<{
    id: string;
    name: string;
    category?: string;
    access_token: string;
    tasks?: string[];
    picture?: { data: { url: string } };
  }>> {
    const res = await this.request<{
      data: Array<{
        id: string;
        name: string;
        category?: string;
        access_token: string;
        tasks?: string[];
        picture?: { data: { url: string } };
      }>;
    }>('/me/accounts', { method: 'GET' }, {
      access_token: accessToken,
      fields: 'id,name,category,access_token,tasks,picture.width(200).height(200)',
    });
    return res.data || [];
  }

  // ==========================================
  // Page Post Publishing
  // ==========================================

  /**
   * Publishes a text post or link post to a Facebook Page.
   */
  public async publishPageFeedPost(
    pageId: string,
    pageAccessToken: string,
    params: {
      message: string;
      link?: string;
      published?: boolean;
      scheduled_publish_time?: number; // UNIX timestamp in seconds
    }
  ): Promise<{ id: string }> {
    const body: Record<string, unknown> = {
      message: params.message,
    };
    if (params.link) body.link = params.link;
    if (params.published !== undefined) body.published = params.published;
    if (params.scheduled_publish_time) body.scheduled_publish_time = params.scheduled_publish_time;

    return this.request(`/${pageId}/feed`, {
      method: 'POST',
      body: JSON.stringify(body),
    }, {
      access_token: pageAccessToken,
    });
  }

  /**
   * Uploads an unpublished photo to a Facebook Page (used to compose multi-photo posts).
   */
  public async uploadPagePhoto(
    pageId: string,
    pageAccessToken: string,
    imageUrl: string,
    published: boolean = false,
    caption?: string
  ): Promise<{ id: string }> {
    return this.request(`/${pageId}/photos`, {
      method: 'POST',
      body: JSON.stringify({
        url: imageUrl,
        published,
        caption: caption || '',
      }),
    }, {
      access_token: pageAccessToken,
    });
  }

  /**
   * Publishes a multi-photo post (handbag gallery) to a Facebook Page.
   */
  public async publishMultiPhotoPost(
    pageId: string,
    pageAccessToken: string,
    params: {
      message: string;
      imageUrls: string[];
      scheduled_publish_time?: number;
    }
  ): Promise<{ id: string }> {
    if (!params.imageUrls || params.imageUrls.length === 0) {
      return this.publishPageFeedPost(pageId, pageAccessToken, {
        message: params.message,
        scheduled_publish_time: params.scheduled_publish_time,
        published: !params.scheduled_publish_time,
      });
    }

    if (params.imageUrls.length === 1) {
      // Single photo post
      return this.request(`/${pageId}/photos`, {
        method: 'POST',
        body: JSON.stringify({
          url: params.imageUrls[0],
          caption: params.message,
          published: !params.scheduled_publish_time,
          scheduled_publish_time: params.scheduled_publish_time,
        }),
      }, {
        access_token: pageAccessToken,
      });
    }

    // Step 1: Upload each photo unpublished
    const photoIds: string[] = [];
    for (const url of params.imageUrls) {
      const uploaded = await this.uploadPagePhoto(pageId, pageAccessToken, url, false);
      photoIds.push(uploaded.id);
    }

    // Step 2: Publish feed post with attached_media
    const attachedMedia = photoIds.map((id) => ({ media_fbid: id }));
    return this.request(`/${pageId}/feed`, {
      method: 'POST',
      body: JSON.stringify({
        message: params.message,
        attached_media: attachedMedia,
        published: !params.scheduled_publish_time,
        scheduled_publish_time: params.scheduled_publish_time,
      }),
    }, {
      access_token: pageAccessToken,
    });
  }

  // ==========================================
  // Marketing API
  // ==========================================

  /**
   * Retrieves accessible Ad Accounts for the authenticated user.
   */
  public async getAdAccounts(userAccessToken: string): Promise<Array<{
    id: string;
    account_id: string;
    name: string;
    currency: string;
    account_status: number;
    amount_spent: string;
  }>> {
    const res = await this.request<{
      data: Array<{
        id: string;
        account_id: string;
        name: string;
        currency: string;
        account_status: number;
        amount_spent: string;
      }>;
    }>('/me/adaccounts', { method: 'GET' }, {
      access_token: userAccessToken,
      fields: 'id,account_id,name,currency,account_status,amount_spent',
    });
    return res.data || [];
  }

  /**
   * Retrieves campaigns for a specified Ad Account.
   */
  public async getCampaigns(adAccountId: string, accessToken: string): Promise<Array<{
    id: string;
    name: string;
    objective: string;
    status: string;
    daily_budget?: string;
    lifetime_budget?: string;
    created_time: string;
    updated_time: string;
  }>> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await this.request<{
      data: Array<{
        id: string;
        name: string;
        objective: string;
        status: string;
        daily_budget?: string;
        lifetime_budget?: string;
        created_time: string;
        updated_time: string;
      }>;
    }>(`/${formattedAccountId}/campaigns`, { method: 'GET' }, {
      access_token: accessToken,
      fields: 'id,name,objective,status,daily_budget,lifetime_budget,created_time,updated_time',
      limit: 50,
    });
    return res.data || [];
  }

  /**
   * Creates a new Ad Campaign under an Ad Account.
   */
  public async createCampaign(
    adAccountId: string,
    accessToken: string,
    params: {
      name: string;
      objective: string;
      status: 'ACTIVE' | 'PAUSED';
      special_ad_categories?: string[];
      daily_budget?: number; // In cents/smallest currency unit
    }
  ): Promise<{ id: string }> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const payload: Record<string, unknown> = {
      name: params.name,
      objective: params.objective,
      status: params.status,
      special_ad_categories: params.special_ad_categories || ['NONE'],
    };
    if (params.daily_budget) {
      payload.daily_budget = params.daily_budget;
    }

    return this.request(`/${formattedAccountId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, {
      access_token: accessToken,
    });
  }

  /**
   * Updates an Ad Campaign's status (ACTIVE, PAUSED, ARCHIVED).
   */
  public async updateCampaignStatus(
    campaignId: string,
    accessToken: string,
    status: 'ACTIVE' | 'PAUSED' | 'ARCHIVED'
  ): Promise<{ success: boolean }> {
    return this.request(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }, {
      access_token: accessToken,
    });
  }

  /**
   * Updates an Ad Campaign's daily budget.
   */
  public async updateCampaignBudget(
    campaignId: string,
    accessToken: string,
    dailyBudgetCents: number
  ): Promise<{ success: boolean }> {
    return this.request(`/${campaignId}`, {
      method: 'POST',
      body: JSON.stringify({ daily_budget: dailyBudgetCents }),
    }, {
      access_token: accessToken,
    });
  }

  /**
   * Retrieves Advertising Insights (impressions, reach, clicks, spend, cpc, cpm, ctr).
   */
  public async getAdAccountInsights(
    adAccountId: string,
    accessToken: string,
    datePreset: string = 'last_30d'
  ): Promise<Array<{
    campaign_id: string;
    campaign_name: string;
    spend: string;
    impressions: string;
    reach: string;
    clicks: string;
    cpc?: string;
    cpm?: string;
    ctr?: string;
    date_start: string;
    date_stop: string;
    actions?: Array<{ action_type: string; value: string }>;
  }>> {
    const formattedAccountId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await this.request<{
      data: Array<{
        campaign_id: string;
        campaign_name: string;
        spend: string;
        impressions: string;
        reach: string;
        clicks: string;
        cpc?: string;
        cpm?: string;
        ctr?: string;
        date_start: string;
        date_stop: string;
        actions?: Array<{ action_type: string; value: string }>;
      }>;
    }>(`/${formattedAccountId}/insights`, { method: 'GET' }, {
      access_token: accessToken,
      level: 'campaign',
      date_preset: datePreset,
      fields: 'campaign_id,campaign_name,spend,impressions,reach,clicks,cpc,cpm,ctr,actions,date_start,date_stop',
    });
    return res.data || [];
  }
}

