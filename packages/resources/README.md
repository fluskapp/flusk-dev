# @flusk/resources

Database repositories, cache clients, and I/O operations for Flusk platform.

## Overview

This package handles **all I/O operations** in the Flusk architecture:
- PostgreSQL database access via repositories
- Redis caching for LLM response deduplication
- SQL migrations for schema management

## Architecture

Following the **Resources = I/O only** principle:
- Pure I/O operations, no business logic
- Typed interfaces using `@flusk/entities`
- Connection pooling and error handling
- Graceful shutdown support

## Structure

```
src/
├── repositories/       # PostgreSQL repositories
│   └── llm-call.repository.ts
├── cache/             # Redis cache clients
│   └── redis.client.ts
└── migrations/        # SQL schema migrations
    └── 001_create_llm_calls.sql
```

## Usage

### LLM Call Repository

```typescript
import { LLMCallRepository } from '@flusk/resources';

// Create new LLM call record
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

// Find by ID
const call = await LLMCallRepository.findById(llmCall.id);

// Find by prompt hash (cache lookup)
const cached = await LLMCallRepository.findByPromptHash('abc123...');

// Update record
await LLMCallRepository.update(llmCall.id, { cached: true });
```

### Redis Cache

```typescript
import { RedisClient } from '@flusk/resources';

// Cache LLM response (24h TTL)
await RedisClient.cacheResponse('promptHash123', 'LLM response text');

// Get cached response
const response = await RedisClient.getCachedResponse('promptHash123');
// Returns: 'LLM response text' or null
```

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string (required)
- `REDIS_URL` - Redis connection string (default: `redis://localhost:6379`)

## Migrations

Run migrations using your preferred tool:

```bash
psql $DATABASE_URL < src/migrations/001_create_llm_calls.sql
```

## Database Schema

### llm_calls Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |
| provider | VARCHAR(255) | LLM provider (e.g., openai) |
| model | VARCHAR(255) | Model identifier |
| prompt | TEXT | Full prompt text |
| prompt_hash | CHAR(64) | SHA-256 hash for deduplication |
| tokens | JSONB | Token usage (input/output/total) |
| cost | DECIMAL(10,6) | Cost in USD |
| response | TEXT | LLM response text |
| cached | BOOLEAN | Cache hit flag |

### Indexes

- `idx_llm_calls_prompt_hash` - Fast cache lookups
- `idx_llm_calls_provider_model` - Analytics queries
- `idx_llm_calls_created_at` - Time-series queries
- `idx_llm_calls_cached` - Cache hit rate analysis
