# Facebook Marketing Automation System (Cambodia Handbags)

An enterprise-grade, serverless Facebook Marketing Automation Dashboard built for managing and automating Facebook Page marketing, post scheduling, advertising campaigns, and group sharing for an online handbag business in Cambodia.

The system integrates directly and exclusively with official **Meta Graph API (v21.0+)** and **Meta Marketing API**, using **Vercel Blob** for persistent JSON state and image storage (no traditional databases, SQL, or Prisma), and **Vercel Cron** for scheduling and automated execution.

---

## 🌟 Key Architecture & Highlights

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Theme Aesthetics**: Modern SaaS dashboard with an initial Pink brand palette (`#ec4899`), fully customizable in Settings (`pink`, `rose`, `purple`, `indigo`).
- **Serverless Storage**: Powered by `@vercel/blob` for JSON documents and product images. Employs optimistic mutex concurrency locking and schema validation via Zod. Automatically falls back to local storage in dev mode when `BLOB_READ_WRITE_TOKEN` is unset.
- **Security & Encryption**: Facebook Page & User access tokens are encrypted with **AES-256-GCM** before persistent storage (`crypto`). Tokens are never sent to client-side JavaScript.
- **Vercel Cron Post Scheduler**: Idempotent task queue processing posts in Cambodia time (`Asia/Phnom_Penh`, UTC+7) with 3-stage exponential backoff and duplicate-publishing protection.
- **Meta Marketing API Management**: Campaign creation with Cambodian audience targeting (Phnom Penh, Siem Reap, Battambang, Women 18-45), hard daily spending safety limit, and mandatory administrator approval before campaign launch or budget increases.
- **Meta Policy Compliance**: Meta-compliant Facebook Group workflow featuring 1-click clipboard captions and direct group links (strictly avoiding unauthorized scrapers or browser bots).

---

## 📁 System Architecture & Vercel Blob Structure

```text
Next.js 16 Dashboard
    │
Next.js Route Handlers
    ├── Meta Graph API (v21.0)
    ├── Meta Marketing API
    ├── Meta OAuth 2.0
    └── Meta Webhooks (HMAC SHA-256)
    │
Vercel Blob Storage
    ├── /config/app-settings.json          (Theme, Timezone, Spending Limits)
    ├── /config/facebook-accounts.json     (AES-256-GCM Encrypted Tokens, Pages, Ad Accounts)
    ├── /posts/drafts.json                 (Draft Handbag Posts)
    ├── /posts/scheduled.json              (Cron Task Queue)
    ├── /posts/published.json              (Published Facebook Post History & Permalinks)
    ├── /campaigns/campaign-config.json    (Ad Campaigns, Cambodian Targeting Presets)
    ├── /groups/group-list.json            (Cambodian Fashion & Buy/Sell Groups Directory)
    ├── /groups/sharing-queue.json         (Manual 1-Click Sharing Tasks)
    ├── /analytics/daily-reports.json      (Cached Marketing Insights)
    ├── /logs/activity.json                (Audit Log with Scrubbed Secrets)
    └── /products/                         (Handbag Product Images)
```

---

## 📋 Required Meta Developer App Permissions

When configuring your Facebook Login App on [developers.facebook.com](https://developers.facebook.com):

| Permission | Purpose |
| :--- | :--- |
| `pages_show_list` | Discovers the Facebook Pages managed by the user. |
| `pages_manage_posts` | Publishes, schedules, and edits feed posts & photo galleries. |
| `pages_read_engagement` | Reads post likes, shares, comments, and engagement. |
| `pages_read_user_content` | Retrieves posts and user comments on the Page. |
| `ads_management` | Creates, pauses, resumes, and budgets ad campaigns. |
| `ads_read` | Retrieves campaign performance insights and spend reports. |
| `business_management` | Accesses business manager assets and handbag ad accounts. |
| `public_profile` | Identifies authenticated administrator profile. |

---

## ⚙️ Environment Variables Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

### Configuration Details

```ini
# Meta / Facebook App Credentials
META_APP_ID=your_facebook_app_id
META_APP_SECRET=your_facebook_app_secret
META_GRAPH_API_VERSION=v21.0
META_REDIRECT_URI=http://localhost:3000/api/facebook/callback

# Security & Encryption Keys
TOKEN_ENCRYPTION_KEY=your-32-byte-secret-key-for-aes-256-gcm
ADMIN_PASSWORD=your_admin_dashboard_password
SESSION_SECRET=your-32-char-session-signing-secret

# Vercel Cron Secret (Matches Authorization header in Vercel Cron)
CRON_SECRET=your_vercel_cron_secret

# Vercel Blob Storage Token (From Vercel Dashboard > Storage > Blob)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_token_here

# App URL
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 🛠️ Step-by-Step Meta Developer App Setup

1. Go to [developers.facebook.com](https://developers.facebook.com/) and click **Create App**.
2. Select **Business** or **Other** as the use case.
3. In App Settings > Basic:
   - Copy your **App ID** and **App Secret** into `META_APP_ID` and `META_APP_SECRET`.
4. Add **Facebook Login for Business**:
   - In **Valid OAuth Redirect URIs**, add:
     - `http://localhost:3000/api/facebook/callback` (for local development)
     - `https://your-domain.vercel.app/api/facebook/callback` (for production)
5. Request the permissions listed above in **App Review > Permissions and Features** (or use Development Mode with Test Users/Admins).

---

## 🚀 Vercel Deployment Instructions

1. Push your repository to GitHub or GitLab:
   ```bash
   git add .
   git commit -m "Complete Facebook Marketing Automation System"
   git push origin main
   ```
2. In the [Vercel Dashboard](https://vercel.com):
   - Click **Add New Project** and import your repository.
   - Go to the **Storage** tab and click **Create Database > Blob**. Connect the Blob store to your project. This automatically provisions `BLOB_READ_WRITE_TOKEN`.
   - Go to **Project Settings > Environment Variables** and add:
     - `META_APP_ID`
     - `META_APP_SECRET`
     - `META_GRAPH_API_VERSION` (`v21.0`)
     - `META_REDIRECT_URI` (`https://<your-project>.vercel.app/api/facebook/callback`)
     - `TOKEN_ENCRYPTION_KEY` (32 characters or random hex)
     - `ADMIN_PASSWORD` (password to login to your dashboard)
     - `SESSION_SECRET` (at least 32 characters)
     - `CRON_SECRET` (secret matching your Vercel Cron)
     - `APP_URL` (`https://<your-project>.vercel.app`)
3. Deploy! Vercel will automatically read `vercel.json` to register the two recurring cron workers:
   - `/api/cron/process-tasks` (every 10 minutes)
   - `/api/cron/sync-analytics` (daily)

---

## 🧪 Testing Instructions

### 1. Build & Type Checking
```bash
npx tsc --noEmit
npm run build
```

### 2. Local Development
```bash
npm run dev
```
Navigate to `http://localhost:3000`. Log in with default password `admin1234` (or your configured `ADMIN_PASSWORD`).

### 3. Testing Dashboard Modules
- **Facebook Accounts** (`/accounts`): Click "Connect Facebook Account" to initiate OAuth, review granted permissions, and select your active handbag Facebook Page.
- **Post Management** (`/posts`): Try creating a post with dual Khmer/English captions and upload product photos. Test "Save as Draft" or "Publish to Facebook Now".
- **Post Scheduler** (`/scheduler`): Schedule a handbag post for 10 minutes in the future. Click "Run Worker Now" to trigger task processing immediately and observe live status updates.
- **Advertising** (`/ads`): Create a campaign in `PAUSED` state. Attempt to launch; observe the required Administrator Confirmation approval modal with daily budget validation.
- **Analytics** (`/analytics`): Filter across Today, Yesterday, Last 7d, and Last 30d. Click "Export Ads CSV" or "Export Posts CSV" to download formatted reporting spreadsheets.
- **Group Management** (`/groups`): Queue a handbag sharing task. Use the "Copy Caption" and "Visit Group" buttons for 1-click posting.
- **Activity Logs** (`/logs`): Verify that all OAuth, posting, scheduling, and budget modifications are chronologically logged with scrubbed tokens.
#   f a c e b o o k - c o n t r o l  
 