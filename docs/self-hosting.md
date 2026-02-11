# Self-Hosting Guide

Deploy your own Flusk instance using Docker Compose.

## Prerequisites

- **Docker** ≥ 24 with Docker Compose v2
- **2 GB RAM** minimum (PostgreSQL + Redis + Flusk server)
- **OpenAI API key** (optional, for similarity search)

## Quick Start

```bash
git clone https://github.com/your-org/flusk.git
cd flusk
cp .env.example .env
# Edit .env with your settings (see Environment Variables below)
docker compose up -d
```

The server starts at `http://localhost:3000`. Verify:

```bash
curl http://localhost:3000/health
# → { "status": "ok", "timestamp": "..." }
```

## Docker Compose Setup

### Development (docker-compose.yml)

The default `docker-compose.yml` runs three services:

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `postgres` | `pgvector/pgvector:pg16` | 5432 | PostgreSQL 16 + pgvector |
| `redis` | `redis:7-alpine` | 6379 | Redis 7 with AOF persistence |
| `flusk` | Built from `Dockerfile` | 3000 | Flusk API server |

```bash
# Start everything
docker compose up -d

# Start only databases (for local development)
docker compose up -d postgres redis

# View logs
docker compose logs -f flusk

# Stop everything
docker compose down

# Stop and remove volumes (⚠️ deletes data)
docker compose down -v
```

### Production (docker-compose.prod.yml)

The production compose file (`docker-compose.prod.yml`) is a stripped-down version with:
- Required `POSTGRES_PASSWORD` (fails if not set)
- PostgreSQL init scripts from `docker/postgres/init/`
- No dev tools

```bash
POSTGRES_PASSWORD=your-secure-password docker compose -f docker-compose.prod.yml up -d
```

## Environment Variables

### Application

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | `development`, `production`, `test` |
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `API_BASE_URL` | `http://localhost:3000` | Public URL for SDK clients |

### Database (PostgreSQL)

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://flusk:dev_password_change_me@localhost:5432/flusk` | Connection string |
| `POSTGRES_HOST` | `localhost` | Host (overrides DATABASE_URL) |
| `POSTGRES_PORT` | `5432` | Port |
| `POSTGRES_DB` | `flusk` | Database name |
| `POSTGRES_USER` | `flusk` | Username |
| `POSTGRES_PASSWORD` | `dev_password_change_me` | Password (**change in production!**) |
| `POSTGRES_POOL_MIN` | `2` | Min pool connections |
| `POSTGRES_POOL_MAX` | `20` | Max pool connections |
| `POSTGRES_POOL_IDLE_TIMEOUT` | `30000` | Idle timeout (ms) |

### Cache (Redis)

| Variable | Default | Description |
|----------|---------|-------------|
| `REDIS_URL` | `redis://localhost:6379/0` | Connection string |
| `REDIS_HOST` | `localhost` | Host |
| `REDIS_PORT` | `6379` | Port |
| `REDIS_DB` | `0` | Database number |
| `REDIS_PASSWORD` | (empty) | Password |
| `REDIS_STREAM_NAME` | `flusk_jobs` | Stream name for job queue |
| `REDIS_CONSUMER_GROUP` | `flusk_workers` | Consumer group |

### LLM API Keys

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | (none) | Required for similarity search & embeddings |
| `OPENAI_ORG_ID` | (none) | OpenAI organization ID |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API base URL |
| `ANTHROPIC_API_KEY` | (none) | Anthropic API key |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | Anthropic base URL |

### Flusk Platform

| Variable | Default | Description |
|----------|---------|-------------|
| `FLUSK_API_KEY` | `test_org_key` | API authentication key |
| `FLUSK_PATTERN_MIN_OCCURRENCES` | `3` | Min occurrences to detect a pattern |
| `FLUSK_PATTERN_CONFIDENCE_THRESHOLD` | `0.85` | Pattern confidence threshold |
| `FLUSK_CACHE_TTL` | `3600` | Cache TTL in seconds |
| `FLUSK_CACHE_MAX_SIZE` | `1000` | Max cache entries |

### Security

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (none) | JWT signing secret (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `7d` | Token expiration |
| `RATE_LIMIT_WINDOW` | `900000` | Rate limit window (ms) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:3001` | Allowed origins (comma-separated) |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug`, `trace` |
| `LOG_PRETTY` | `true` | Pretty-print logs in dev |
| `SENTRY_DSN` | (none) | Sentry error tracking DSN |
| `SENTRY_ENVIRONMENT` | `development` | Sentry environment |

### Vector Search

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `EMBEDDING_DIMENSIONS` | `1536` | Embedding vector dimensions |
| `VECTOR_SIMILARITY_THRESHOLD` | `0.95` | Cosine similarity threshold (0-1) |

### Docker Compose

| Variable | Default | Description |
|----------|---------|-------------|
| `COMPOSE_PROJECT_NAME` | `flusk` | Docker project name |
| `ADMINER_PORT` | `8080` | Adminer UI port |
| `REDISINSIGHT_PORT` | `8001` | RedisInsight port |

## Database Migrations

Migrations are SQL files in `packages/resources/src/migrations/`:

```
001_create_llm_calls.sql
002_patterns.sql
003_conversions.sql
004_audit_logs.sql
005_add_consent_fields.sql
006_add_embeddings.sql
007_routing.sql
008_traces.sql
009_spans.sql
010_optimizations.sql
011_prompt_templates.sql
012_prompt_versions.sql
```

Run migrations:

```bash
# With Docker
docker compose exec flusk pnpm db:migrate

# Locally
pnpm db:migrate
```

The migration script (`scripts/migrate.ts`) runs all SQL files in order. It's idempotent — safe to run multiple times.

The Docker entrypoint (`scripts/docker-entrypoint.sh`) automatically runs migrations on startup.

## Monitoring & Health Checks

### Liveness Probe

```
GET /health → 200 { "status": "ok" }
```

Use for Kubernetes liveness checks. Returns 200 if the Node.js process is alive.

### Readiness Probe

```
GET /health/ready → 200 { "status": "ready", "checks": { "database": "ok", "redis": "ok" } }
```

Use for Kubernetes readiness checks. Verifies database and Redis connectivity.

### Docker Health Checks

The `docker-compose.yml` includes health checks for PostgreSQL and Redis:

- **PostgreSQL:** `pg_isready` every 5s, 10 retries
- **Redis:** `redis-cli ping` every 5s, 10 retries
- **Flusk** depends on both being healthy before starting

### Real-time Monitoring

Connect to the SSE endpoint for live cost tracking:

```bash
curl -N http://localhost:3000/api/v1/events/costs
```

## Troubleshooting

### Server won't start

1. Check database is healthy: `docker compose ps`
2. Check logs: `docker compose logs flusk`
3. Verify `DATABASE_URL` is correct in `.env`
4. Run migrations manually: `pnpm db:migrate`

### "Embeddings not configured" (503)

Set `OPENAI_API_KEY` in `.env`. Similarity search requires an OpenAI API key for embedding generation.

### Connection refused to PostgreSQL

- Ensure PostgreSQL is running: `docker compose up -d postgres`
- Check port binding: `docker compose port postgres 5432`
- If running Flusk locally (not in Docker), use `localhost:5432`
- If running Flusk in Docker, use `postgres:5432` (Docker networking)

### Redis connection errors

- Ensure Redis is running: `docker compose up -d redis`
- Check `REDIS_URL` matches your setup
- If using a password, set `REDIS_PASSWORD`

### Migrations fail

- Check PostgreSQL logs: `docker compose logs postgres`
- Ensure the `uuid-ossp` and `vector` extensions are available
- The `pgvector/pgvector:pg16` image includes both by default
- Init script `docker/postgres/init/00_extensions.sql` creates them on first run

### High memory usage

- Redis is capped at 256MB (`maxmemory 256mb`) with LRU eviction
- Adjust `POSTGRES_POOL_MAX` to limit connection count
- Consider reducing `FLUSK_CACHE_MAX_SIZE`
