# Phase 2 Status — Semantic Similarity with pgvector

## ✅ COMPLETE — Pushed to GitHub

**Commit:** `8528940` on `main`
**Date:** 2026-02-10

## What was built

### New files (8)
- `packages/resources/src/clients/openai-embedding.client.ts` — OpenAI text-embedding-3-small client
- `packages/resources/src/migrations/006_add_embeddings.sql` — pgvector column + IVFFlat index
- `packages/resources/src/repositories/llm-call/find-similar.ts` — cosine similarity search
- `packages/resources/src/repositories/llm-call/update-embedding.ts` — store embedding vector
- `packages/execution/src/hooks/embedding.hook.ts` — async fire-and-forget embedding on create
- `packages/execution/src/routes/similarity-routes/` — search + backfill endpoints (split for 100-line limit)
- `packages/business-logic/src/pattern/detect-similar-groups.function.ts` — pure greedy clustering

### Modified files (5)
- `packages/execution/src/app.ts` — register similarity routes
- `packages/execution/src/routes/llm-calls-routes/create-llm-call.ts` — call scheduleEmbedding
- `packages/resources/src/repositories/llm-call/index.ts` — export new functions
- `packages/business-logic/src/pattern/index.ts` — export detectSimilarGroups
- `packages/resources/src/clients/embedding.client.ts` — trimmed under 100 lines

### Tests (10 new)
- 7 unit tests: `detect-similar-groups.test.ts`
- 3 integration tests: `similarity.test.ts`
- **All 52 tests passing** across 9 test files

## Key design decisions
- **Async embeddings**: fire-and-forget via `scheduleEmbedding()` — doesn't slow LLM call tracking
- **Graceful degradation**: no OPENAI_API_KEY → skip embeddings silently, similarity endpoint returns 503
- **Configurable threshold**: `VECTOR_SIMILARITY_THRESHOLD` env var, default 0.95
- **Input truncation**: prompts capped at 8000 chars before embedding
- **IVFFlat index**: fast approximate cosine search with 100 lists

## Issues found and fixed during review
1. `similarity.routes.ts` was 101 lines → split into sub-files
2. `embedding.client.ts` was 117 lines → trimmed to ~80
3. Default threshold was inconsistent (0.90 vs 0.95) → standardized to 0.95
4. `embedding.hook.ts` used deep import path not in package exports → fixed to barrel import
5. Local PostgreSQL was shadowing Docker pgvector container → stopped local, used Docker
6. `VECTOR_SIMILARITY_THRESHOLD` in .env.example was 0.7 → updated to 0.95

## Environment note
Local PostgreSQL@16 (Homebrew) was running alongside Docker and doesn't have pgvector.
Stopped it with `brew services stop postgresql@16` to use Docker's pgvector/pgvector:pg16.
