# Phase 1 Status — Foundation (2026-02-10)

## ✅ What Works

### Real Server (`server.ts`)
- Fastify app wired with PostgreSQL + Redis via `@flusk/execution`
- `pnpm dev` (tsx watch) and `pnpm start` both work
- All routes functional under `/api/v1/`:
  - `POST /api/v1/llm-calls` — create LLM call, auto-calculates cost
  - `GET /api/v1/llm-calls/:id` — get by UUID
  - `GET /api/v1/llm-calls/by-hash/:hash` — cache lookup
  - `GET /api/v1/patterns` — list with filters
  - `GET /api/v1/patterns/:id` — get by UUID
  - `POST /api/v1/patterns` — create pattern
  - `DELETE /api/v1/gdpr/user/:orgId` — GDPR deletion
  - `GET /api/v1/gdpr/user/:orgId/data` — GDPR export
  - `GET /health` — liveness check

### Infrastructure
- Docker Compose: PostgreSQL 16 (pgvector) + Redis 7
- `pnpm db:up` / `pnpm db:down` scripts
- `pnpm db:migrate` runs all SQL migrations in order
- Migration tracking via `_migrations` table

### Hooks Pipeline
- `hashPromptHook` — SHA-256 prompt deduplication
- `checkCacheHook` — Redis cache lookup (returns cached response)
- `calculateCostHook` — auto-calculates USD cost from pricing tables
- `cacheResponseHook` — stores response in Redis after creation

### SDK Streaming Support
- `wrapOpenAI()` — now tracks streaming responses (collects chunks, reports after stream ends)
- `wrapAnthropic()` — same streaming support added
- Non-streaming tracking unchanged (backward compatible)

## 🔧 What Was Fixed

1. **`pnpm-workspace.yaml`** — removed `!packages/execution` exclusion
2. **Package exports** — pointed to `src/*.ts` for tsx dev (was `dist/*.js`)
3. **Hooks** — implemented real `hashPromptHook`, `checkCacheHook`, `calculateCostHook`, `cacheResponseHook` (were empty stubs)
4. **Shared DB pool** — `packages/resources/src/db/pool.ts` replaces 3 duplicate `pool.ts` singletons
5. **Migrations 006-009** — deleted (broken CLI-generated stubs conflicting with 001-005)
6. **Migration 005** — fixed to use `IF NOT EXISTS` (was double-adding columns)
7. **`app.ts`** — rewired to use direct route registration instead of `fp()` plugins (prefix was broken)
8. **`pattern.routes.ts`** — added `GET /` listing route (was missing)
9. **Root `package.json`** — added workspace deps, new scripts

## ⚠️ Needs Attention (Phase 2)

### Automatic Pattern Detection
- Patterns are only created manually via `POST /patterns`
- Need: auto-detect patterns when LLM calls are created (use `detectDuplicates()` from business-logic)
- Consider: background job or inline hook after call creation

### Conversion/Suggestions API
- Conversion routes exist (`conversion.routes.ts`) but not wired in `app.ts`
- Business logic has `generateCacheRule()` and `generateDowngrade()` ready to use
- Need: wire conversion plugin, add analyze endpoint

### Organization ID
- Currently defaults to `'default'` when no auth
- `llm_calls.organization_id` is nullable — should be required
- Auth middleware works but is disabled in dev

### Response Schema Serialization
- Fastify schema serialization may strip fields not in schema
- `rowToEntity` returns `organizationId`, `consentGiven`, `consentPurpose` but response schema doesn't include them

### Production Build
- Packages don't build to `dist/` (exports point to `src/` for tsx)
- For production: need `pnpm build` to compile, then switch exports back to `dist/`
- Consider using `tsconfig` paths or `conditions` (`development` vs `production`)

### Tests
- No automated test suite (E2E was manual via curl)
- `tests/e2e/full-flow.test.ts` exists but untested

## 📁 Key Files Changed/Created

```
server.ts                          — Real server entry point
scripts/migrate.ts                 — Migration runner
.env                               — Default env vars
docker/postgres/init/00_ext.sql    — pgvector extension init
packages/execution/src/app.ts      — Rewired app factory
packages/execution/src/hooks/llm-call.hooks.ts — Real hook implementations
packages/execution/src/routes/pattern.routes.ts — Fixed pattern routes
packages/resources/src/db/pool.ts  — Shared DB pool singleton
packages/sdk/node/src/wrappers/openai.ts    — Streaming support
packages/sdk/node/src/wrappers/anthropic.ts — Streaming support
```

## 🚀 Quick Start

```bash
pnpm db:up          # Start PostgreSQL + Redis
pnpm db:migrate     # Run migrations
pnpm dev            # Start dev server (hot reload)
```
