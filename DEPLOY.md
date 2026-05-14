# Cluvi Deployment Guide

## Environment Variables

Copy these to your deployment environment:

```env
# Database (required)
DATABASE_URL=postgresql://user:password@host:5432/cluvi

# Clerk Auth (required)
CLERK_PUBLISHABLE_KEY=pk_live_...
CLERK_SECRET_KEY=sk_live_...
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...

# Session (required)
SESSION_SECRET=your-long-random-secret

# AI - Gemini (required for Pro users)
GEMINI_API_KEY=AIza...

# AI - OpenRouter (for free tier users, Replit-managed)
AI_INTEGRATIONS_OPENROUTER_BASE_URL=https://...
AI_INTEGRATIONS_OPENROUTER_API_KEY=...

# Admin Access (comma-separated Clerk IDs)
ADMIN_CLERK_IDS=user_abc123,user_def456

# Payment Webhooks (optional — add whichever you use)
LEMONSQUEEZY_WEBHOOK_SECRET=...
POLAR_WEBHOOK_SECRET=...
WHOP_WEBHOOK_SECRET=...
# Gumroad uses IP allowlist, no secret needed
```

---

## Option 1: Deploy to Vercel

Vercel works best with the frontend only (static export). The API server needs a separate host (Railway, Render, etc.) since it's Express + PostgreSQL.

### Step 1: Prepare vercel.json

Create `vercel.json` at the project root:

```json
{
  "buildCommand": "pnpm --filter @workspace/cluvi run build",
  "outputDirectory": "artifacts/cluvi/dist",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": null,
  "rewrites": [
    { "source": "/api/(.*)", "destination": "https://your-api-server.railway.app/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### Step 2: Deploy API server to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Set root directory: `artifacts/api-server`
3. Set start command: `node --enable-source-maps ./dist/index.mjs`
4. Add a PostgreSQL plugin → copy `DATABASE_URL`
5. Add all environment variables above
6. Deploy → copy the public URL

### Step 3: Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import GitHub repo
2. Framework preset: **Other**
3. Build command: `pnpm --filter @workspace/cluvi run build`
4. Output directory: `artifacts/cluvi/dist`
5. Install command: `pnpm install --frozen-lockfile`
6. Add environment variables (VITE_* prefix for frontend ones)
7. Update `vercel.json` rewrites with your Railway API URL
8. Deploy

### Step 4: Update Clerk

In your Clerk dashboard:
- Add your Vercel domain to "Allowed origins"
- Update "Sign-in redirect URL" to `https://your-app.vercel.app/dashboard`

---

## Option 2: Deploy to VPS (Ubuntu 22.04 + Docker)

### Step 1: Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
```

### Step 2: Create docker-compose.yml

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: cluvi
      POSTGRES_USER: cluvi
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U cluvi"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://cluvi:${DB_PASSWORD}@db:5432/cluvi
      NODE_ENV: production
      PORT: 8080
      CLERK_PUBLISHABLE_KEY: ${CLERK_PUBLISHABLE_KEY}
      CLERK_SECRET_KEY: ${CLERK_SECRET_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
      GEMINI_API_KEY: ${GEMINI_API_KEY}
      AI_INTEGRATIONS_OPENROUTER_BASE_URL: ${AI_INTEGRATIONS_OPENROUTER_BASE_URL}
      AI_INTEGRATIONS_OPENROUTER_API_KEY: ${AI_INTEGRATIONS_OPENROUTER_API_KEY}
      ADMIN_CLERK_IDS: ${ADMIN_CLERK_IDS}
      LEMONSQUEEZY_WEBHOOK_SECRET: ${LEMONSQUEEZY_WEBHOOK_SECRET}
      POLAR_WEBHOOK_SECRET: ${POLAR_WEBHOOK_SECRET}
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8080:8080"

  web:
    build:
      context: .
      dockerfile: Dockerfile.web
    restart: unless-stopped
    ports:
      - "3000:80"

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - api
      - web

volumes:
  pgdata:
```

### Step 3: Create Dockerfile.api

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig*.json ./
COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm run typecheck:libs
RUN pnpm --filter @workspace/api-server run build

FROM node:24-alpine
WORKDIR /app
COPY --from=builder /app/artifacts/api-server/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
```

### Step 4: Create Dockerfile.web

```dockerfile
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig*.json ./
COPY lib/ lib/
COPY artifacts/cluvi/ artifacts/cluvi/
ARG VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
RUN npm install -g pnpm && pnpm install --frozen-lockfile
RUN pnpm --filter @workspace/cluvi run build

FROM nginx:alpine
COPY --from=builder /app/artifacts/cluvi/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### Step 5: Create nginx.conf (reverse proxy)

```nginx
events { worker_processes auto; }
http {
  server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
      proxy_pass http://api:8080;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
      proxy_pass http://web:80;
    }
  }
}
```

### Step 6: Create nginx-spa.conf (SPA routing)

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  index index.html;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

### Step 7: Create .env file on your server

```bash
# Copy all env vars from the Environment Variables section above
DB_PASSWORD=very-secure-password
SESSION_SECRET=very-long-random-string
# ... etc
```

### Step 8: Deploy

```bash
# On your VPS:
git clone https://github.com/your-org/cluvi.git
cd cluvi
cp .env.example .env  # fill in values
docker compose up -d

# Run DB migrations:
docker compose exec api node -e "
  const { drizzle } = require('drizzle-orm/pg');
  // Or run: pnpm --filter @workspace/db run push from builder
"
```

### SSL with Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Payment Provider Webhook URLs

Set these webhook URLs in each provider's dashboard:

| Provider | Webhook URL |
|---|---|
| LemonSqueezy | `https://your-domain.com/api/webhooks/lemonsqueezy` |
| Polar | `https://your-domain.com/api/webhooks/polar` |
| Whop | `https://your-domain.com/api/webhooks/whop` |
| Gumroad | `https://your-domain.com/api/webhooks/gumroad` |

### Credit Amounts (configurable via product metadata)

When creating products in each payment provider, add metadata:
```json
{ "credits": 200, "package": "pro" }
```

Or use the defaults: `starter=50`, `pro=200`, `power=500`

### LemonSqueezy Setup

1. Dashboard → Settings → Webhooks → Add Webhook
2. URL: your webhook URL above  
3. Events: `order_created`, `subscription_payment_success`
4. Copy signing secret → set as `LEMONSQUEEZY_WEBHOOK_SECRET`

### Polar Setup

1. Dashboard → Settings → Webhooks → New Webhook
2. URL + select `order.created` event
3. Copy signing secret → `POLAR_WEBHOOK_SECRET`

### Whop Setup  

1. Developer → Webhooks → Create
2. URL + select `payment.succeeded`
3. Secret → `WHOP_WEBHOOK_SECRET`

### Gumroad Setup

1. Settings → Advanced → Ping → enable Ping
2. URL: your gumroad webhook
3. No secret needed (verify by IP if needed)
