# @flusk/resources

Storage repositories and I/O operations for Flusk.

## Overview

All I/O operations live here — no business logic. Supports two storage modes:

- **SQLite** (default) — local mode, uses `node:sqlite` (zero dependencies)
- **PostgreSQL** (opt-in) — server mode, with Redis caching

## Storage Adapter

```typescript
import { createStorage } from '@flusk/resources';

// Returns SQLite or Postgres storage based on FLUSK_MODE
const storage = createStorage();
```

## SQLite Storage (Local Mode)

Uses Node.js built-in `node:sqlite`. Data stored in `~/.flusk/data.db`.

### Structure

```
src/sqlite/
├── connection.ts          # SQLite connection management
├── migrations.ts          # Auto-run schema migrations
├── repositories/
│   ├── llm-call/          # LLM call CRUD + cost queries
│   ├── analyze-session/   # Analysis session tracking
│   ├── performance-pattern/
│   └── profile-session/
└── sql/                   # Raw SQL statements
```

### Usage

```typescript
import { SqliteStorage } from '@flusk/resources';

const db = new SqliteStorage();
await db.llmCalls.create({ provider: 'openai', model: 'gpt-4', ... });
const total = await db.llmCalls.sumCostSince('2024-01-01');
```

## PostgreSQL Storage (Server Mode)

### LLM Call Repository

```typescript
import { LLMCallRepository } from '@flusk/resources';

const llmCall = await LLMCallRepository.create({
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'Hello, world!',
  promptHash: 'abc123...',
  tokens: { input: 10, output: 20, total: 30 },
  cost: 0.002,
  response: 'Hello! How can I help?',
  cached: false
});

const cached = await LLMCallRepository.findByPromptHash('abc123...');
```

### Redis Cache

```typescript
import { RedisClient } from '@flusk/resources';

await RedisClient.cacheResponse('promptHash123', 'LLM response text');
const response = await RedisClient.getCachedResponse('promptHash123');
```

## Environment Variables

- `FLUSK_MODE` — `local` (SQLite, default) or `server` (PostgreSQL + Redis)
- `DATABASE_URL` — PostgreSQL connection string (server mode)
- `REDIS_URL` — Redis connection string (default: `redis://localhost:6379`)

## Migrations

SQLite migrations run automatically on first connection.

PostgreSQL migrations:

```bash
psql $DATABASE_URL < src/migrations/001_create_llm_calls.sql
```
