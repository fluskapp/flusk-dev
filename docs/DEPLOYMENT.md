# Flusk Platform - Vercel Deployment Guide

## Overview
This guide covers deploying the Flusk platform to Vercel's serverless infrastructure.

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Vercel CLI installed: `npm i -g vercel`
- PostgreSQL database (Vercel Postgres or Neon recommended)
- Redis instance (Upstash Redis recommended)

---

## Step 1: Database Setup

### Option A: Vercel Postgres (Recommended for Vercel deployments)

1. Navigate to your Vercel project dashboard
2. Go to **Storage** → **Create Database** → **Postgres**
3. Follow the setup wizard
4. Copy the `DATABASE_URL` environment variable

**Connection Pooling:**
Vercel Postgres includes built-in connection pooling via PgBouncer.

### Option B: Neon (Serverless Postgres)

1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string with pooling:
   ```
   postgresql://[user]:[password]@[host]/[db]?sslmode=require&pooler=true
   ```

**Advantages:**
- Serverless-native (auto-scaling)
- Generous free tier
- Built-in connection pooling
- Branching for preview deployments

### Option C: Supabase

1. Sign up at https://supabase.com
2. Create a new project
3. Navigate to **Settings** → **Database**
4. Copy the **Connection Pooling** string (port 6543)

---

## Step 2: Redis Setup (Upstash)

1. Sign up at https://upstash.com
2. Create a new Redis database
3. Select region closest to your Vercel deployment
4. Copy the **REST URL** and **REST TOKEN**:
   ```
   REDIS_URL=https://[endpoint].upstash.io
   REDIS_TOKEN=your_token_here
   ```

**Why Upstash?**
- HTTP-based (no persistent connections)
- Serverless-friendly
- Pay-per-request pricing
- Global edge replication available

---

## Step 3: Environment Variables

### Required Variables

Set these in your Vercel project settings (**Settings** → **Environment Variables**):

```bash
# Database
DATABASE_URL=postgresql://user:password@host/db?sslmode=require

# Redis (Upstash)
REDIS_URL=https://your-redis.upstash.io
REDIS_TOKEN=your_upstash_token

# Application
NODE_ENV=production
LOG_LEVEL=info

# Optional: Authentication
REQUIRE_AUTH=false
API_KEY_SALT=your_random_salt_here

# Optional: CORS
CORS_ORIGIN=https://yourdomain.com

# Optional: ML Service (if using external service)
ML_SERVICE_URL=https://your-ml-service.com
```

### Environment Variable Scopes

- **Production**: Used for `vercel.com` domain
- **Preview**: Used for preview deployments (PR branches)
- **Development**: Used for `vercel dev`

Recommended: Set all variables for **Production** and **Preview**.

---

## Step 4: Build Configuration

### Update `package.json`

Add Vercel-specific build script to root `package.json`:

```json
{
  "scripts": {
    "build": "pnpm -r build",
    "vercel-build": "pnpm build",
    "dev": "pnpm -r dev",
    "start": "tsx server.ts"
  }
}
```

### Install Vercel Node Runtime

```bash
pnpm add -D @vercel/node
```

---

## Step 5: Deploy to Vercel

### Via Vercel CLI

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy (first time):**
   ```bash
   vercel
   ```
   - Select your account
   - Link to existing project or create new
   - Follow prompts

3. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Via GitHub Integration (Recommended)

1. Push code to GitHub repository
2. Go to https://vercel.com/new
3. **Import** your repository
4. **Configure project:**
   - Framework Preset: **Other**
   - Build Command: `pnpm vercel-build`
   - Output Directory: (leave empty)
   - Install Command: `pnpm install`

5. **Add environment variables** (from Step 3)
6. Click **Deploy**

**Automatic deployments:**
- `main` branch → Production
- Pull requests → Preview deployments

---

## Step 6: Post-Deployment Setup

### 1. Run Database Migrations

After first deployment, run migrations manually:

```bash
# Using Vercel CLI
vercel env pull .env.production
pnpm run migrate
```

Or connect directly to your database and run migration scripts.

### 2. Verify Health Endpoint

```bash
curl https://your-project.vercel.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

### 3. Test API Endpoint

```bash
curl -X POST https://your-project.vercel.app/api/v1/llm-calls \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "provider": "openai",
    "prompt": "Test prompt",
    "maxTokens": 100
  }'
```

---

## Step 7: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

Update `CORS_ORIGIN` environment variable:
```bash
CORS_ORIGIN=https://yourdomain.com
```

---

## Serverless Considerations

### Cold Starts
- **First request**: ~1-3 seconds (cold start)
- **Subsequent requests**: ~50-200ms (warm)
- **Mitigation**: The adapter caches the Fastify instance

### Timeouts
- **Hobby plan**: 10 seconds max
- **Pro plan**: 60 seconds max
- Ensure all API calls complete within limits

### Connection Pooling
- Use connection pooling for PostgreSQL (PgBouncer, Neon pooler)
- Upstash Redis uses HTTP (no persistent connections)
- Avoid opening new connections per request

### Stateless Design
- No background jobs (use Vercel Cron or external queue)
- No in-memory caching across requests (use Redis)
- No file system writes (use S3/Vercel Blob)

---

## Monitoring & Debugging

### Vercel Logs

View logs in real-time:
```bash
vercel logs [deployment-url]
```

Or view in Vercel Dashboard:
- **Deployments** → Select deployment → **Logs**

### Error Tracking

Consider integrating:
- **Sentry**: Error tracking
- **LogTail**: Log aggregation
- **Axiom**: Analytics & logs

Add to `vercel-adapter.ts`:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

---

## Troubleshooting

### Build Failures

**Error: Module not found**
- Ensure all dependencies in `package.json`
- Check `pnpm-lock.yaml` is committed
- Verify build command: `pnpm vercel-build`

**Error: TypeScript compilation failed**
- Run `pnpm build` locally to verify
- Check `tsconfig.json` paths

### Runtime Errors

**Error: Connection timeout (PostgreSQL)**
- Use connection pooling (add `?pooler=true` to Neon URL)
- Verify `DATABASE_URL` is correct
- Check database allows connections from Vercel IPs

**Error: Redis connection failed**
- Ensure using Upstash REST API (not TCP)
- Verify `REDIS_URL` and `REDIS_TOKEN`
- Check Upstash dashboard for errors

**Error: Function timeout (10s/60s)**
- Optimize slow database queries
- Add indexes to database
- Reduce LLM max tokens
- Consider moving to background job

### Cold Start Optimization

**Reduce bundle size:**
```json
{
  "vercel": {
    "functions": {
      "packages/execution/src/vercel-adapter.ts": {
        "excludeFiles": "**/__tests__/**"
      }
    }
  }
}
```

**Lazy load heavy dependencies:**
```typescript
// ✅ Good: Lazy import
const { heavyFunction } = await import('./heavy.js');

// ❌ Bad: Top-level import
import { heavyFunction } from './heavy.js';
```

---

## Production Checklist

- [ ] Database migrations run successfully
- [ ] All environment variables set (Production + Preview)
- [ ] Health endpoint returns `200 OK`
- [ ] API endpoints tested (POST, GET)
- [ ] Custom domain configured (if applicable)
- [ ] CORS origins configured correctly
- [ ] Authentication enabled (`REQUIRE_AUTH=true`)
- [ ] Monitoring/error tracking configured
- [ ] Rate limiting configured (if needed)
- [ ] Database connection pooling verified
- [ ] Redis cache working
- [ ] Logs viewable in Vercel dashboard

---

## Cost Estimation

### Vercel Pricing

**Hobby (Free):**
- 100 GB bandwidth/month
- Serverless function execution included
- Custom domains supported
- 10s function timeout

**Pro ($20/month):**
- 1 TB bandwidth
- 60s function timeout
- Advanced analytics
- Password protection for previews

### Database Costs

**Vercel Postgres:**
- Free tier: 256 MB storage, 60 hours compute
- Pro: ~$10/month for 512 MB

**Neon:**
- Free tier: 0.5 GB storage, 3 projects
- Pro: ~$19/month for 10 GB

**Supabase:**
- Free tier: 500 MB storage, 2 GB bandwidth
- Pro: ~$25/month for 8 GB

### Redis Costs

**Upstash:**
- Free tier: 10,000 commands/day
- Pay-as-you-go: $0.20 per 100k commands

---

## Next Steps

1. Set up CI/CD with GitHub Actions
2. Configure preview deployments for PRs
3. Add performance monitoring
4. Implement rate limiting
5. Set up backup strategy for database

For questions or issues, refer to:
- Vercel Docs: https://vercel.com/docs
- Neon Docs: https://neon.tech/docs
- Upstash Docs: https://docs.upstash.com

---

**🚀 Your Flusk platform is now deployed on Vercel!**
