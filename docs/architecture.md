# Flusk Architecture

## Package Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                    @flusk/execution                      │
│            (Fastify routes, plugins, hooks)              │
│     Depends on: entities, types, business-logic,        │
│                 resources                                │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
             ▼              ▼              ▼
┌────────────────┐ ┌───────────────┐ ┌──────────────────┐
│ @flusk/business │ │  @flusk/      │ │   @flusk/        │
│    -logic       │ │  resources    │ │   types          │
│ (Pure functions)│ │ (DB, Redis,   │ │ (Insert/Update/  │
│ No I/O, no side │ │  OpenAI, etc) │ │  Query schemas)  │
│ effects         │ │               │ │                  │
└───────┬────────┘ └──────┬────────┘ └────────┬─────────┘
        │                 │                    │
        ▼                 ▼                    ▼
   ┌──────────────────────────────────────────────┐
   │              @flusk/entities                   │
   │      (TypeBox schemas — single source of       │
   │       truth for all data shapes)               │
   └────────────────────────────────────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   @flusk/sdk     │     │   @flusk/cli     │
│  (Node.js SDK)   │     │  (Code generator │
│ Wraps OpenAI/    │     │   & validators)  │
│ Anthropic        │     │                  │
│ Calls execution  │     │ Generates all    │
│ API over HTTP    │     │ package files    │
└──────────────────┘     └──────────────────┘
```

### Key principle: Data flows one way

1. **Entities** define shapes (TypeBox schemas)
2. **Types** derive Insert/Update/Query variants
3. **Business logic** validates and transforms (pure functions, no I/O)
4. **Resources** persist and retrieve (PostgreSQL, Redis, OpenAI embeddings)
5. **Execution** composes everything into HTTP endpoints
6. **SDK** provides client-side wrappers for the HTTP API
7. **CLI** scaffolds new features across all packages

---

## Data Flow Diagrams

### LLM Call Tracking Flow

```
Client SDK                 Flusk Server                      Database
    │                          │                               │
    │  POST /api/v1/llm-calls  │                               │
    ├─────────────────────────>│                               │
    │                          │                               │
    │                   ┌──────┴──────┐                        │
    │                   │ hashPrompt  │  SHA-256 hash          │
    │                   │    hook     │  the prompt            │
    │                   └──────┬──────┘                        │
    │                          │                               │
    │                   ┌──────┴──────┐     ┌─────────────┐    │
    │                   │ checkCache  │────>│ Redis cache  │    │
    │                   │    hook     │<────│  lookup      │    │
    │                   └──────┬──────┘     └─────────────┘    │
    │                          │                               │
    │              [cache miss]│                                │
    │                          │                               │
    │                   ┌──────┴──────┐                        │
    │                   │calculateCost│  Pricing tables        │
    │                   │    hook     │  per model              │
    │                   └──────┬──────┘                        │
    │                          │                               │
    │                          │   INSERT llm_calls            │
    │                          ├──────────────────────────────>│
    │                          │                               │
    │                   ┌──────┴──────┐                        │
    │                   │  schedule   │  Async (non-blocking)  │
    │                   │ embedding   │  OpenAI embedding API  │
    │                   └──────┬──────┘                        │
    │                          │                               │
    │                   ┌──────┴──────┐                        │
    │                   │ emit cost   │  SSE to dashboards     │
    │                   │   event     │                        │
    │                   └──────┬──────┘                        │
    │                          │                               │
    │   201 Created            │                               │
    │<─────────────────────────┤                               │
```

### Model Routing Flow

```
Client                     Flusk Server                      Database
  │                            │                               │
  │  POST /api/v1/route        │                               │
  ├───────────────────────────>│                               │
  │                            │                               │
  │                     ┌──────┴──────┐                        │
  │                     │ Load routing│  SELECT from           │
  │                     │    rule     │  routing_rules         │
  │                     └──────┬──────┘                        │
  │                            │                               │
  │                     ┌──────┴──────────┐                    │
  │                     │ classifyComplex │  Pure function      │
  │                     │   ity(prompt,   │  tokenCount +       │
  │                     │   tokenCount)   │  heuristics         │
  │                     └──────┬──────────┘                    │
  │                            │                               │
  │                     ┌──────┴──────┐     ┌──────────────┐   │
  │                     │ selectModel │────>│ model_perf   │   │
  │                     │  (BL func)  │<────│ table lookup │   │
  │                     └──────┬──────┘     └──────────────┘   │
  │                            │                               │
  │                     ┌──────┴──────┐                        │
  │                     │   Record    │  INSERT routing_       │
  │                     │  decision   │  decisions             │
  │                     └──────┬──────┘                        │
  │                            │                               │
  │  { selectedModel, ...}     │                               │
  │<───────────────────────────┤                               │
```

### Trace/Span Flow

```
Client SDK                  Flusk Server                   Database
  │                             │                            │
  │ POST /traces                │                            │
  ├────────────────────────────>│  INSERT traces             │
  │                             ├───────────────────────────>│
  │ { id: "trace-1" }          │                            │
  │<────────────────────────────┤                            │
  │                             │                            │
  │ POST /spans                 │                            │
  │ { traceId: "trace-1" }     │  INSERT spans              │
  ├────────────────────────────>├───────────────────────────>│
  │ { id: "span-1" }           │                            │
  │<────────────────────────────┤                            │
  │                             │                            │
  │ POST /spans/span-1/complete │                            │
  │ { cost, tokens }           │  UPDATE spans              │
  ├────────────────────────────>├───────────────────────────>│
  │                             │                            │
  │ POST /traces/trace-1/      │                            │
  │        complete             │                            │
  ├────────────────────────────>│                            │
  │                             │  SELECT spans              │
  │                             │  WHERE traceId             │
  │                             │  aggregateTraceStats()     │
  │                             │  UPDATE traces             │
  │                             ├───────────────────────────>│
  │ { totalCost, ... }         │                            │
  │<────────────────────────────┤                            │
```

---

## How Each Feature Works

### LLM Call Tracking
- SDK wraps `openai.chat.completions.create` / `anthropic.messages.create`
- Intercepts both streaming and non-streaming responses
- Captures token usage, cost, latency, and full prompt/response text
- Server-side hooks: hash prompt → check cache → calculate cost → store → emit event
- Async embedding generation (non-blocking) for similarity search

### Pattern Detection
- When an LLM call is tracked, its prompt hash is checked against existing patterns
- If a matching hash exists, the pattern's `occurrenceCount` is incremented
- If not, a new pattern is created with `occurrenceCount: 1`
- Patterns reaching the threshold trigger conversion suggestions

### Similarity Search
- Uses OpenAI's `text-embedding-3-small` model to generate 1536-dim vectors
- Stored in PostgreSQL using pgvector extension
- Cosine similarity search finds near-duplicate prompts
- Configurable threshold (default 0.95) and result limit

### Model Routing
- User creates routing rules with quality thresholds
- When `route()` is called, prompt complexity is classified (simple/medium/complex)
- The router looks up model performance data for that complexity category
- Selects the cheapest model that meets the quality threshold
- Falls back to the user's specified fallback model if nothing qualifies

### Optimizations (Code Generation)
- Analyzes tracked patterns and generates actionable code snippets
- Types: cache configs, model swap suggestions, prompt dedup, batch merge
- Each optimization includes ready-to-use TypeScript/Python/JSON code

### Prompt Templates & Versioning
- Templates store prompt text with `{{variable}}` placeholders
- Versions are immutable — new edits create new versions
- A/B testing: random traffic split between control and candidate versions
- Metrics tracking per version (quality, latency, cost)
- Auto-rollback when a new version's metrics regress vs. previous

### Distributed Tracing
- Traces represent end-to-end workflows (e.g., an AI agent handling a request)
- Spans represent individual steps within a trace (LLM calls, tool calls, retrievals)
- Spans can be nested via `parentSpanId`
- Completing a trace aggregates all span stats (total cost, tokens, latency)

---

## Database Schema Overview

All tables use UUID primary keys and ISO 8601 timestamps.

### `llm_calls`
Core table — stores every tracked LLM API call.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | Unique identifier |
| `provider` | `text` | LLM provider (openai, anthropic, etc.) |
| `model` | `text` | Model identifier |
| `prompt` | `text` | Full prompt text |
| `prompt_hash` | `text(64)` | SHA-256 hash for dedup |
| `tokens` | `jsonb` | `{ input, output, total }` |
| `cost` | `numeric` | Cost in USD |
| `response` | `text` | Full response text |
| `cached` | `boolean` | Whether served from cache |
| `organization_id` | `text` | Org ID (GDPR) |
| `consent_given` | `boolean` | GDPR consent flag |
| `consent_purpose` | `text` | Processing purpose |
| `embedding` | `vector(1536)` | pgvector embedding |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### `patterns`
Detected repetitive prompt patterns.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | |
| `prompt_hash` | `text(64)` | Groups identical prompts |
| `occurrence_count` | `integer` | Times observed |
| `first_seen_at` | `timestamptz` | |
| `last_seen_at` | `timestamptz` | |
| `sample_prompts` | `jsonb` | Up to 5 samples |
| `avg_cost` | `numeric` | |
| `total_cost` | `numeric` | |
| `suggested_conversion` | `text` | |

### `conversions`
Optimization suggestions (cache, downgrade, remove).

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `pattern_id` | `uuid` FK | Source pattern |
| `organization_id` | `uuid` | |
| `conversion_type` | `text` | cache, downgrade, remove |
| `status` | `text` | suggested, accepted, rejected |
| `estimated_savings` | `numeric` | Monthly savings in USD |
| `config` | `jsonb` | Type-specific config |

### `audit_logs`
GDPR audit trail.

### `routing_rules`
Model routing configuration per org.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `organization_id` | `text` | |
| `name` | `text` | |
| `quality_threshold` | `numeric` | Min quality 0-1 |
| `fallback_model` | `text` | |
| `enabled` | `boolean` | |

### `routing_decisions`
Logged routing decisions for analytics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `rule_id` | `uuid` FK | |
| `selected_model` | `text` | |
| `original_model` | `text` | |
| `reason` | `text` | |
| `cost_saved` | `numeric` | |

### `model_performance`
Self-improving routing table — updated after every tracked call.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `model` | `text` | |
| `prompt_category` | `text` | simple, medium, complex |
| `avg_quality` | `numeric` | |
| `avg_latency_ms` | `numeric` | |
| `avg_cost_per_1k_tokens` | `numeric` | |
| `sample_count` | `integer` | |

### `traces`
Distributed trace roots.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | |
| `name` | `text` | |
| `total_cost` | `numeric` | Aggregated from spans |
| `total_tokens` | `numeric` | |
| `total_latency_ms` | `numeric` | |
| `call_count` | `integer` | |
| `status` | `text` | running, completed, failed |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |

### `spans`
Individual steps within traces.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `trace_id` | `uuid` FK | |
| `parent_span_id` | `uuid` FK (nullable) | For nesting |
| `type` | `text` | llm, tool, retrieval, chain |
| `name` | `text` | |
| `input` | `text` | |
| `output` | `text` | |
| `cost` | `numeric` | |
| `tokens` | `numeric` | |
| `latency_ms` | `numeric` | |
| `status` | `text` | running, completed, failed |
| `started_at` | `timestamptz` | |
| `completed_at` | `timestamptz` | |

### `optimizations`
Generated code optimization suggestions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | |
| `type` | `text` | cache-config, model-swap, prompt-dedup, batch-merge |
| `title` | `text` | |
| `description` | `text` | |
| `estimated_savings_per_month` | `numeric` | |
| `generated_code` | `text` | |
| `language` | `text` | typescript, python, json |
| `status` | `text` | suggested, applied, dismissed |
| `source_pattern_id` | `uuid` FK (nullable) | |

### `prompt_templates`
Prompt templates with variable placeholders.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `organization_id` | `uuid` | |
| `name` | `text` | |
| `description` | `text` | |
| `active_version_id` | `uuid` FK (nullable) | |
| `variables` | `jsonb` | Array of variable names |

### `prompt_versions`
Immutable prompt versions with metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` PK | |
| `template_id` | `uuid` FK | |
| `version` | `integer` | Auto-increment per template |
| `content` | `text` | Prompt with `{{var}}` placeholders |
| `metrics` | `jsonb` | `{ avgQuality, avgLatencyMs, avgCost, sampleCount }` |
| `status` | `text` | draft, active, archived, rolled-back |

---

## Design Decisions and Trade-offs

### TypeBox for schemas (not Zod)
TypeBox generates JSON Schema at compile time, integrating natively with Fastify's validation. Zod would require runtime conversion. Trade-off: less ecosystem adoption.

### Monorepo with strict layering
The `entities → types → business-logic → resources → execution` dependency chain enforces separation of concerns. Trade-off: more boilerplate, but each layer is independently testable.

### Pure business logic (no I/O)
All functions in `@flusk/business-logic` are pure — no database calls, no HTTP, no side effects. This makes them trivially testable and deterministic. Trade-off: requires hook/route composition in the execution layer.

### pgvector for similarity search
Rather than a separate vector database, Flusk uses PostgreSQL's pgvector extension. This simplifies deployment (one database) at the cost of vector search performance at very large scale.

### Prompt hash deduplication
SHA-256 hashing enables O(1) exact-match deduplication. Similarity search (vector-based) catches near-duplicates. Trade-off: exact hash misses semantically identical prompts with different wording.

### Server-Sent Events for real-time
SSE was chosen over WebSocket for cost events because:
- Simpler to implement (no upgrade handshake)
- Works through HTTP/2 and most CDNs
- Unidirectional (client only listens)
- Trade-off: no bidirectional communication

### Async embedding generation
Embeddings are generated asynchronously after the LLM call is stored, avoiding latency on the hot path. Trade-off: there's a brief window where similarity search won't find a just-tracked call.
