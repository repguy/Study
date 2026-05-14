# Cluvi Deployment Guide

## Environment Variables

### Required for Vercel (set in Vercel dashboard → Project Settings → Environment Variables)

```env
# Database (Supabase)
# Use the "Transaction" pooler connection string from:
# Supabase Dashboard → Project Settings → Database → Connection string → Transaction pooler
DATABASE_URL=postgresql://postgres.xxxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# Clerk Auth
# Get from: clerk.com → your app → API Keys
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Session secret (generate with: openssl rand -base64 32)
SESSION_SECRET=your-long-random-secret

# Gemini AI — choose one:
# Option A: Your own Google API key (from aistudio.google.com)
GEMINI_API_KEY=AIza...
# Option B: Replit AI proxy (copy values from Replit Secrets tab)
# AI_INTEGRATIONS_GEMINI_BASE_URL=https://...
# AI_INTEGRATIONS_GEMINI_API_KEY=...

# OpenRouter (optional — for free-tier users with custom models)
AI_INTEGRATIONS_OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
AI_INTEGRATIONS_OPENROUTER_API_KEY=sk-or-...

# Admin access (comma-separated Clerk user IDs)
ADMIN_CLERK_IDS=user_abc123,user_def456

# Payment webhooks (optional — add whichever you use)
LEMONSQUEEZY_WEBHOOK_SECRET=...
POLAR_WEBHOOK_SECRET=...
WHOP_WEBHOOK_SECRET=...
```

---

## Deploy to Vercel (recommended — single platform)

The project deploys as:
- **Frontend**: React/Vite static site served by Vercel CDN
- **API**: Express app running as a Vercel Serverless Function at `/api/*`

### Step 1: Set up Supabase

1. Go to [supabase.com](https://supabase.com) → New Project
2. Once created: **Project Settings → Database → Connection string → Transaction pooler**
3. Copy the connection string (it looks like `postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres`)
4. Run the schema migration from your Replit workspace:
   ```bash
   # In Replit terminal — temporarily set your Supabase URL:
   DATABASE_URL="your-supabase-url" pnpm --filter @workspace/db run push
   ```

### Step 2: Deploy to Vercel

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import your repo
3. Vercel will auto-detect `vercel.json` — use these settings:
   - **Framework preset**: Other
   - **Build command**: (auto from vercel.json)
   - **Output directory**: (auto from vercel.json)
4. Go to **Environment Variables** and add all vars from the list above
5. Click **Deploy**

### Step 3: Update Clerk

In your [Clerk dashboard](https://dashboard.clerk.com):
- Add your Vercel domain to **Allowed origins**: `https://your-app.vercel.app`
- Update **Sign-in redirect URL** to: `https://your-app.vercel.app/dashboard`
- Update **Sign-up redirect URL** to: `https://your-app.vercel.app/dashboard`

### Step 4: Update Vercel with Clerk keys

Make sure both `CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PUBLISHABLE_KEY` are set to your **live** (not test) Clerk key in Vercel's environment variables. Redeploy after adding them.

---

## Vercel Serverless Function Notes

- The API is mounted at `api/index.ts` which wraps the Express app
- All `/api/*` requests are routed to this serverless function via `vercel.json`
- Function timeout is set to **60 seconds** (Vercel Pro) — enough for AI generation
- If you're on the Hobby plan, the timeout is capped at 10s — upgrade to Pro or use Railway for the API

---

## Alternative: Split deployment (API on Railway)

If you prefer the API separately (e.g. on Hobby plan), remove `api/index.ts` and deploy:

- **Frontend**: Vercel (uses static build)
- **API**: Railway → root directory `artifacts/api-server`, start command `node --enable-source-maps ./dist/index.mjs`

Then update `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://your-api.railway.app/api/:path*" },
    { "source": "/((?!api).*)", "destination": "/index.html" }
  ]
}
```

---

## Run Database Migrations (Supabase)

After any schema change, push to Supabase:

```bash
# From your Replit terminal:
DATABASE_URL="your-supabase-url" pnpm --filter @workspace/db run push
```

Or use `drizzle-kit generate` + `migrate` for versioned migrations.

---

## Payment Provider Webhook URLs

Set these in each provider's dashboard:

| Provider     | Webhook URL                                        |
|--------------|----------------------------------------------------|
| LemonSqueezy | `https://your-app.vercel.app/api/webhooks/lemonsqueezy` |
| Polar        | `https://your-app.vercel.app/api/webhooks/polar`        |
| Whop         | `https://your-app.vercel.app/api/webhooks/whop`         |
| Gumroad      | `https://your-app.vercel.app/api/webhooks/gumroad`      |

### Credit Amounts (configurable via product metadata)

When creating products, add metadata:
```json
{ "credits": 200, "package": "pro" }
```

Defaults: `starter=50`, `pro=200`, `power=500`

---

## Docker / VPS (self-hosted)

See original docker-compose setup — provision your own PostgreSQL (or use Supabase) and set `DATABASE_URL` accordingly.
