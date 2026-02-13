# Flusk API Reference

Base URL: `http://localhost:3000/api/v1`

All endpoints require `Authorization: Bearer <api-key>` when auth is
enabled.

---

## LLM Call Tracking

### POST /api/v1/llm-calls

Create an LLM call record. Returns cached response if prompt hash
matches.

**Body:** `provider`, `model`, `prompt`, `tokens` (input/output/total),
`response`

**Hooks:** hashPrompt → checkCache → calculateCost → cacheResponse

### GET /api/v1/llm-calls/:id

Retrieve by UUID.

### GET /api/v1/llm-calls/by-hash/:hash

Lookup by prompt SHA-256 hash.

---

## Similarity Search

### POST /api/v1/similarity/similar

Find semantically similar prompts via pgvector cosine similarity.

**Body:** `prompt`, `threshold` (default 0.95), `limit` (default 20)

### POST /api/v1/similarity/backfill-embeddings

Generate embeddings for calls that don't have them. Requires
`OPENAI_API_KEY`.

---

## Model Routing

### POST /api/v1/route

Ask which model to use for a prompt.

**Body:** `ruleId`, `prompt`, `tokenCount`, `originalModel`

**Returns:** `selectedModel`, `reason`, `complexity`, `expectedQuality`

### GET /api/v1/route/performance

Model performance metrics by prompt category.

### GET /api/v1/route/savings/:ruleId

Cost savings summary for a routing rule.

### Routing Rules CRUD

`POST/GET/PATCH/DELETE /api/v1/routing-rules`

---

## Traces & Spans

### POST /api/v1/traces

Create a trace (start tracking a workflow).

### POST /api/v1/traces/:id/complete

Complete trace, aggregate stats from child spans.

### GET /api/v1/traces/:id/waterfall

All spans for waterfall visualization.

### POST /api/v1/spans

Create a span within a trace.

### POST /api/v1/spans/:id/complete

Complete span with output, cost, tokens.

---

## Optimizations

### POST /api/v1/optimizations/generate

Generate optimization suggestions for an organization.

### GET /api/v1/optimizations/:orgId

List optimizations.

### GET /api/v1/optimizations/:id/code

Get generated code for an optimization.

---

## Prompt Templates & Versioning

### POST /api/v1/prompt-templates

Create template with variables.

### POST /api/v1/prompt-templates/:id/render

Render with variable substitution.

### POST /api/v1/prompt-templates/:id/ab-test

Render with A/B test variant selection.

### POST /api/v1/prompt-versions

Create a version for a template.

### POST /api/v1/prompt-versions/:id/activate

Set as active version.

### POST /api/v1/prompt-versions/:id/rollback

Roll back to previous version.

### PATCH /api/v1/prompt-versions/:id/metrics

Report quality/latency/cost metrics.

---

## Profiles

### POST /api/v1/profiles

Create a profile session (CPU/heap profiling run).

### GET /api/v1/profiles/:id

Get profile session by UUID.

### GET /api/v1/profiles?organizationId=...

List profile sessions for an organization.

### GET /api/v1/profiles/:id/correlations

Get correlations between profile data and LLM calls.

### GET /api/v1/profiles/:id/suggestions

Get optimization suggestions from profiling data.

### Schemas

**profile-session:** id, organizationId, type (cpu/heap), duration,
startedAt, completedAt, status, metadata

**performance-pattern:** id, profileSessionId, patternType, hotspot,
callCount, totalTime, suggestion

---

## Cost Events (SSE)

### GET /api/v1/events/costs

Real-time stream of cost events via Server-Sent Events.

---

## Patterns

### GET /api/v1/patterns

List detected prompt patterns with occurrence counts and savings.

---

## GDPR

### DELETE /api/v1/gdpr/user/:orgId

Right to deletion.

### GET /api/v1/gdpr/user/:orgId/data

Right to data portability.

---

## Health

### GET /health

Liveness probe.

### GET /health/ready

Readiness probe (DB + Redis connectivity).
