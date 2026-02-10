# Flusk — LLM API Cost Optimization Platform

Open-source platform that detects wasteful LLM API usage patterns and suggests optimizations (caching, model downgrades, prompt deduplication).

## Quick Start

```bash
# 1. Start infrastructure
pnpm db:up            # PostgreSQL 16 (pgvector) + Redis 7

# 2. Run migrations
pnpm db:migrate

# 3. Start dev server
pnpm dev              # http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/llm-calls` | Record an LLM call (auto-calculates cost, caches) |
| GET | `/api/v1/llm-calls/:id` | Get LLM call by ID |
| GET | `/api/v1/llm-calls/by-hash/:hash` | Cache lookup by prompt hash |
| GET | `/api/v1/patterns` | List detected patterns |
| GET | `/api/v1/patterns/:id` | Get pattern by ID |
| POST | `/api/v1/patterns` | Create pattern manually |
| DELETE | `/api/v1/gdpr/user/:orgId` | GDPR data deletion |
| GET | `/api/v1/gdpr/user/:orgId/data` | GDPR data export |
| GET | `/health` | Liveness check |
| GET | `/health/ready` | Readiness check |

## SDK Usage

```typescript
import OpenAI from 'openai';
import { wrapOpenAI } from '@flusk/sdk';

const openai = wrapOpenAI(new OpenAI(), {
  fluskUrl: 'http://localhost:3000',
});

// Use normally — Flusk tracks costs automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

## Architecture

- **Monorepo** (pnpm workspaces): `packages/` contains entities, business-logic, resources, execution, sdk, cli
- **Business logic** is pure functions (no I/O) — easy to test
- **Hooks pipeline**: hashPrompt → checkCache → calculateCost → cacheResponse
- **PostgreSQL 16** with pgvector for storage
- **Redis 7** for response caching

## Testing

```bash
pnpm test              # All tests (unit + integration)
pnpm test:unit         # Business logic unit tests only
pnpm test:integration  # API integration tests (requires Docker)
```

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `PORT` — Server port (default: 3000)
- `OPENAI_API_KEY` — For SDK usage
- `ANTHROPIC_API_KEY` — For SDK usage

## License

MIT
