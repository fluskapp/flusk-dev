# Self-Hosting Guide

Self-hosting is an upgrade path from the CLI. Use it when you need
persistent monitoring, team dashboards, or semantic similarity search.

## When to self-host

- You want a team dashboard
- You need pgvector semantic similarity search
- You're monitoring multiple services in production
- You want Redis caching and job queues

## When to use CLI mode

- You're a single developer
- You want quick cost analysis
- You don't want to run infrastructure

## Prerequisites

- **Docker** ≥ 24 with Docker Compose v2
- **2 GB RAM** minimum

## Quick Start

```bash
git clone https://github.com/adirbenyossef/flusk.git
cd flusk
cp .env.example .env
docker compose up -d
```

The server starts at `http://localhost:3000`.

## Point your app at the server

```bash
export FLUSK_ENDPOINT=http://localhost:3000
node --import @flusk/otel ./index.js
```

Or use the CLI:

```bash
flusk analyze ./my-app.js --mode server
```

## Services

| Service | Port | Description |
|---------|------|-------------|
| `flusk` | 3000 | API server |
| `postgres` | 5432 | PostgreSQL 16 + pgvector |
| `redis` | 6379 | Redis 7 |

## Environment Variables

See `.env.example` for all options. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `OPENAI_API_KEY` — Required for similarity search
- `FLUSK_API_KEY` — API authentication

## Health Checks

```bash
curl http://localhost:3000/health        # liveness
curl http://localhost:3000/health/ready   # readiness (DB + Redis)
```

## Migrations

```bash
docker compose exec flusk pnpm db:migrate
```

Migrations run automatically on startup.

## Production

```bash
POSTGRES_PASSWORD=secure-password \
  docker compose -f docker-compose.prod.yml up -d
```
