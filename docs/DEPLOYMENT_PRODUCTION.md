# Flusk Production Deployment Guide

Complete guide for deploying Flusk to production environments.

---

## Deployment Options

### Quick Comparison

| Method | Setup Time | Cost | Scalability | Best For |
|--------|-----------|------|-------------|----------|
| **Vercel** | 5 min | Free tier | Auto | Startups, MVP |
| **Docker** | 15 min | $20-50/mo | Manual | Self-hosted |
| **AWS ECS** | 30 min | $50-200/mo | Auto | Enterprise |
| **Railway** | 10 min | $5-20/mo | Auto | Small teams |

---

## Option 1: Vercel (Recommended for Startups)

### Prerequisites
- Vercel account
- GitHub repository
- PostgreSQL database (Neon, Supabase, or Vercel Postgres)

### Step 1: Prepare Repository

```bash
# Ensure these files exist
ls -la
# - server-minimal.ts ✓
# - package.json ✓
# - vercel.json (create below)
```

Create `vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-minimal.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server-minimal.ts"
    }
  ]
}
```

### Step 2: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Follow prompts:
# - Project name: flusk
# - Build command: pnpm build
# - Output directory: .
```

### Step 3: Add Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

### Step 4: Verify Deployment

```bash
# Test health endpoint
curl https://your-project.vercel.app/health

# Expected: {"status":"ok","timestamp":"..."}
```

**Cost**: Free tier supports ~100K requests/month

---

## Option 2: Docker (Self-Hosted)

### Prerequisites
- Docker & Docker Compose installed
- VPS or cloud instance (2GB RAM minimum)

### Step 1: Create Dockerfile

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine

# Install pnpm
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/*/package.json ./packages/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build packages (CLI, SDK)
RUN pnpm build 2>/dev/null || true

# Expose port
EXPOSE 3000

# Start server
CMD ["pnpm", "start"]
```

### Step 2: Create docker-compose.yml

```yaml
version: '3.8'

services:
  flusk:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - LOG_LEVEL=info
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### Step 3: Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:3000/health
```

### Step 4: Setup Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/flusk
server {
    listen 80;
    server_name flusk.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/flusk /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Add SSL with Let's Encrypt
sudo certbot --nginx -d flusk.yourdomain.com
```

**Cost**: $5-20/month (DigitalOcean, Linode, Hetzner)

---

## Option 3: Railway

### Prerequisites
- Railway account
- GitHub repository

### Step 1: Connect Repository

1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your Flusk repository

### Step 2: Configure Build

Railway auto-detects Node.js. Add these settings:

**Build Command:**
```bash
pnpm install && pnpm build 2>/dev/null || true
```

**Start Command:**
```bash
pnpm start
```

### Step 3: Add Environment Variables

In Railway Dashboard → Variables:

```bash
NODE_ENV=production
PORT=${{PORT}}
LOG_LEVEL=info
```

### Step 4: Deploy

Click "Deploy" - Railway will:
1. Build your application
2. Deploy to their infrastructure
3. Provide a public URL

**Cost**: $5/month starter plan, scales automatically

---

## Option 4: AWS ECS (Enterprise)

### Prerequisites
- AWS account
- AWS CLI configured
- Docker installed

### Step 1: Create ECR Repository

```bash
# Create repository
aws ecr create-repository --repository-name flusk

# Get login token
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### Step 2: Build and Push Docker Image

```bash
# Build
docker build -t flusk:latest .

# Tag
docker tag flusk:latest \
  <account-id>.dkr.ecr.us-east-1.amazonaws.com/flusk:latest

# Push
docker push <account-id>.dkr.ecr.us-east-1.amazonaws.com/flusk:latest
```

### Step 3: Create ECS Task Definition

Create `task-definition.json`:

```json
{
  "family": "flusk",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "flusk",
      "image": "<account-id>.dkr.ecr.us-east-1.amazonaws.com/flusk:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "PORT", "value": "3000"}
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/flusk",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

### Step 4: Create ECS Service

```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Create service
aws ecs create-service \
  --cluster default \
  --service-name flusk \
  --task-definition flusk \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx],assignPublicIp=ENABLED}"
```

### Step 5: Setup Load Balancer

```bash
# Create Application Load Balancer
aws elbv2 create-load-balancer \
  --name flusk-lb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-xxx

# Create target group
aws elbv2 create-target-group \
  --name flusk-targets \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health
```

**Cost**: $50-200/month depending on traffic

---

## Post-Deployment Checklist

### Security

- [ ] **HTTPS enabled** (SSL certificate installed)
- [ ] **API key authentication** implemented
- [ ] **Rate limiting** configured
- [ ] **CORS** properly set up
- [ ] **Security headers** added (Helmet.js)

### Monitoring

```bash
# Setup health checks
curl https://your-domain.com/health
curl https://your-domain.com/health/ready

# Monitor logs
# Vercel: vercel logs
# Docker: docker-compose logs -f
# AWS: aws logs tail /ecs/flusk --follow
```

### Backup

- [ ] Database backups enabled
- [ ] Configuration backed up
- [ ] Deployment rollback plan tested

### Performance

```bash
# Load test with Apache Bench
ab -n 1000 -c 10 https://your-domain.com/health

# Expected:
# - Response time: <100ms
# - Success rate: 100%
# - No errors
```

---

## Scaling Guidelines

### Horizontal Scaling

**When**: >10K requests/hour

**How**:
- Vercel: Automatic
- Docker: `docker-compose up --scale flusk=3`
- AWS ECS: Increase `desired-count`
- Railway: Upgrade plan

### Database Optimization

**When**: >100K tracked calls

**Options**:
1. Add PostgreSQL + pgvector (from in-memory)
2. Add Redis for caching
3. Add read replicas

### CDN Setup

**When**: Global users

**How**: Add Cloudflare or AWS CloudFront

```bash
# Cloudflare setup
1. Add domain to Cloudflare
2. Update DNS records
3. Enable caching rules
4. Set up rate limiting
```

---

## Environment Variables Reference

### Required

```bash
NODE_ENV=production           # Enables production optimizations
PORT=3000                    # Server port
```

### Optional

```bash
LOG_LEVEL=info              # Logging level (error, warn, info, debug)
HOST=0.0.0.0                # Bind address
CORS_ORIGIN=*               # CORS allowed origins
```

### Future (PostgreSQL)

```bash
DATABASE_URL=postgresql://... # PostgreSQL connection string
REDIS_URL=redis://...        # Redis connection string
ENCRYPTION_KEY=...           # 32-byte encryption key
```

---

## Monitoring & Alerts

### Uptime Monitoring

**UptimeRobot** (Free):
```
Monitor Type: HTTPS
URL: https://your-domain.com/health
Interval: 5 minutes
```

### Application Monitoring

**Sentry** (Error tracking):
```bash
npm install @sentry/node

# Add to server-minimal.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: 'production'
});
```

### Logging

**Better Stack** (Log aggregation):
```bash
# Forward logs to Better Stack
docker-compose logs -f | \
  curl -X POST https://in.logs.betterstack.com \
  -H "Authorization: Bearer $BETTERSTACK_TOKEN" \
  -d @-
```

---

## Troubleshooting

### Deployment Fails

```bash
# Vercel: Check build logs
vercel logs

# Docker: Check build process
docker-compose build --no-cache

# AWS: Check CloudWatch logs
aws logs tail /ecs/flusk
```

### High Memory Usage

```bash
# Check container stats
docker stats

# Restart if needed
docker-compose restart
```

### Slow Response Times

```bash
# Profile with curl
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/health

# curl-format.txt:
#   time_namelookup:  %{time_namelookup}\n
#   time_connect:  %{time_connect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#   time_total:  %{time_total}\n
```

---

## Cost Optimization

### Development/Staging

- Use free tiers (Vercel, Railway free trial)
- Share instances across environments
- Use in-memory storage

### Production (Small)

- Railway: $5/month
- Single container
- In-memory storage

### Production (Medium)

- Vercel Pro: $20/month
- Docker on VPS: $20/month
- Add PostgreSQL: +$15/month

### Production (Large)

- AWS ECS: $100-200/month
- Load balancer: +$20/month
- RDS PostgreSQL: +$50/month
- Total: ~$200/month for 1M+ requests

---

## Next Steps

1. ✅ Choose deployment method
2. ✅ Configure environment variables
3. ✅ Deploy to production
4. ✅ Test all endpoints
5. ✅ Setup monitoring
6. ✅ Configure backups
7. ✅ Document for team

**Recommended Path**: Start with Vercel/Railway, migrate to Docker/AWS as you scale.
