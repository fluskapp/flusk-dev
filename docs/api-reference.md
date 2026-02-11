# Flusk API Reference

Base URL: `http://localhost:3000/api/v1`

All endpoints require `Authorization: Bearer <api-key>` header (when auth is enabled).

---

## 1. LLM Call Tracking

Track and query LLM API calls for cost analysis and optimization.

### POST /api/v1/llm-calls

Create a new LLM call record. If an identical prompt (by hash) was previously tracked, returns the cached response.

**Why:** This is the core ingestion endpoint. Every LLM call flows through here for pattern detection, cost tracking, and caching.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `provider` | `string` | ✅ | LLM provider name (e.g., `openai`, `anthropic`) |
| `model` | `string` | ✅ | Model identifier (e.g., `gpt-4`, `claude-3-opus`) |
| `prompt` | `string` | ✅ | Full prompt text sent to the LLM |
| `tokens` | `object` | ✅ | Token usage breakdown |
| `tokens.input` | `integer` | ✅ | Number of input tokens |
| `tokens.output` | `integer` | ✅ | Number of output tokens |
| `tokens.total` | `integer` | ✅ | Total tokens (input + output) |
| `response` | `string` | ✅ | Full response text from the LLM |

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "provider": "openai",
  "model": "gpt-4",
  "prompt": "Translate 'hello' to French",
  "promptHash": "a3f2b8c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1",
  "tokens": { "input": 12, "output": 3, "total": 15 },
  "cost": 0.00045,
  "response": "Bonjour",
  "cached": false,
  "createdAt": "2026-02-11T12:00:00.000Z",
  "updatedAt": "2026-02-11T12:00:00.000Z"
}
```

**Response (200 OK — Cached):**

```json
{
  "cached": true,
  "response": "Bonjour",
  "promptHash": "a3f2b8c1...",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Hooks applied:** `hashPrompt` → `checkCache` → `calculateCost` → `cacheResponse`

**SDK Example:**

```typescript
await flusk.track({
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'Translate "hello" to French',
  response: 'Bonjour',
  promptTokens: 12,
  completionTokens: 3,
  totalTokens: 15,
  latencyMs: 450,
});
```

---

### GET /api/v1/llm-calls/:id

Retrieve an LLM call record by its UUID.

**Path Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | `uuid` | LLM call unique identifier |

**Response (200):** Same schema as creation response above.

**Response (404):**

```json
{ "error": "LLM call not found" }
```

---

### GET /api/v1/llm-calls/by-hash/:hash

Look up an LLM call by its prompt SHA-256 hash. Useful for cache lookups.

**Path Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `hash` | `string` (64 chars) | SHA-256 hash of the prompt |

**Response (200):** LLM call entity.

**Response (404):**

```json
{ "error": "No cached response found for this hash" }
```

---

## 2. Similarity Search

Find semantically similar prompts using vector embeddings (pgvector). Requires `OPENAI_API_KEY` for embedding generation.

### POST /api/v1/similarity/similar

Search for prompts similar to the given text using cosine similarity.

**Why:** Identifies near-duplicate prompts that slight wording variations prevent hash-based dedup from catching.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt` | `string` | ✅ | Prompt text to search for |
| `threshold` | `number` | ❌ | Cosine similarity threshold 0-1 (default: `0.95`) |
| `limit` | `integer` | ❌ | Max results 1-100 (default: `20`) |

**Response (200):**

```json
{
  "results": [
    {
      "id": "550e8400-...",
      "prompt": "Translate 'hi' to French",
      "model": "gpt-4",
      "similarity": 0.97,
      "cost": 0.00045
    }
  ]
}
```

**Response (503):**

```json
{ "error": "Embeddings not configured" }
```

---

### POST /api/v1/similarity/backfill-embeddings

Generate vector embeddings for existing LLM calls that don't have them yet.

**Why:** If you started tracking calls before enabling embeddings, this backfills missing vectors.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `limit` | `integer` | ❌ | Max calls to process 1-500 (default: `100`) |

**Response (200):**

```json
{
  "processed": 95,
  "errors": 5
}
```

---

## 3. Model Routing

Intelligent model selection based on prompt complexity and quality thresholds.

### POST /api/v1/route

Ask Flusk which model to use for a given prompt.

**Why:** Routes simple prompts to cheaper models while preserving quality for complex ones. Saves cost without sacrificing output quality.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `ruleId` | `uuid` | ✅ | Routing rule to apply |
| `prompt` | `string` | ✅ | The prompt text |
| `tokenCount` | `integer` | ✅ | Estimated token count |
| `originalModel` | `string` | ✅ | Model the user originally requested |

**Response (200):**

```json
{
  "selectedModel": "gpt-4o-mini",
  "reason": "cheapest-qualifying",
  "complexity": "simple",
  "expectedQuality": 0.92
}
```

**Error Responses:**

- `404`: `{ "error": "Rule not found" }`
- `400`: `{ "error": "Rule is disabled" }`

**SDK Example:**

```typescript
const result = await flusk.route({
  ruleId: 'rule-uuid',
  prompt: 'What is 2+2?',
  tokenCount: 10,
  originalModel: 'gpt-4',
});
// result.selectedModel → 'gpt-4o-mini'
```

---

### GET /api/v1/route/performance

Get model performance metrics by prompt category.

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `promptCategory` | `string` | ❌ | Filter by category (e.g., `simple`, `medium`, `complex`) |

**Response (200):** Array of `ModelPerformance` entities.

---

### GET /api/v1/route/savings/:ruleId

Get cost savings summary for a specific routing rule.

**Path Parameters:**

| Field | Type | Description |
|-------|------|-------------|
| `ruleId` | `string` | Routing rule UUID |

**Response (200):** Savings summary object.

---

### Routing Rules CRUD

#### POST /api/v1/routing-rules

Create a new routing rule.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | `string` | ✅ | Organization ID |
| `name` | `string` | ✅ | Human-readable rule name |
| `qualityThreshold` | `number` | ✅ | Min quality score 0-1 |
| `fallbackModel` | `string` | ✅ | Model when no cheaper option qualifies |
| `enabled` | `boolean` | ❌ | Whether rule is active (default: `false`) |

**Response (201):** Created routing rule entity.

#### GET /api/v1/routing-rules?organizationId=...

List routing rules for an organization.

#### PATCH /api/v1/routing-rules/:id

Update a routing rule. Body accepts any subset of: `name`, `qualityThreshold`, `fallbackModel`, `enabled`.

#### DELETE /api/v1/routing-rules/:id

Delete a routing rule. Returns `204 No Content`.

---

## 4. Traces & Spans

Track multi-step AI agent workflows with distributed tracing.

### POST /api/v1/traces

Create a new trace (start tracking a workflow).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | `uuid` | ✅ | Organization ID |
| `name` | `string` | ✅ | Trace name (e.g., agent workflow name) |

**Response (201):**

```json
{
  "id": "trace-uuid",
  "organizationId": "org-uuid",
  "name": "customer-support-agent",
  "totalCost": 0,
  "totalTokens": 0,
  "totalLatencyMs": 0,
  "callCount": 0,
  "status": "running",
  "startedAt": "2026-02-11T12:00:00.000Z",
  "completedAt": null,
  "createdAt": "2026-02-11T12:00:00.000Z",
  "updatedAt": "2026-02-11T12:00:00.000Z"
}
```

### GET /api/v1/traces/:id

Get a trace by UUID.

### GET /api/v1/traces/organization/:organizationId

List all traces for an organization.

### POST /api/v1/traces/:id/complete

Complete a trace. Automatically aggregates stats (cost, tokens, latency, call count) from all child spans.

**Response (200):** Updated trace with aggregated stats.

### GET /api/v1/traces/:id/waterfall

Get all spans for a trace (for waterfall visualization).

**Response (200):** Array of span entities.

---

### POST /api/v1/spans

Create a new span within a trace.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `traceId` | `uuid` | ✅ | Parent trace ID |
| `parentSpanId` | `uuid \| null` | ❌ | Parent span for nesting |
| `type` | `string` | ✅ | `llm`, `tool`, `retrieval`, or `chain` |
| `name` | `string` | ✅ | Span name |
| `input` | `string \| null` | ❌ | Input data |

**Response (201):** Span entity with `status: "running"`.

### GET /api/v1/spans/:id

Get a span by UUID.

### GET /api/v1/spans/trace/:traceId

Get all spans for a trace.

### POST /api/v1/spans/:id/complete

Complete a span with results.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `output` | `string \| null` | ❌ | Output data |
| `cost` | `number` | ✅ | Cost in USD |
| `tokens` | `number` | ✅ | Token count |

**Response (200):** Updated span with calculated `latencyMs` and `status: "completed"`.

---

## 5. Optimizations (Code Generation)

Generate actionable code snippets for cost optimization.

### POST /api/v1/optimizations/generate

Generate optimization suggestions for an organization based on tracked call patterns.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | `uuid` | ✅ | Organization to analyze |

**Response (200):**

```json
[
  {
    "id": "opt-uuid",
    "organizationId": "org-uuid",
    "type": "cache-config",
    "title": "Cache repeated translation prompts",
    "description": "45 identical prompts detected in the last 7 days",
    "estimatedSavingsPerMonth": 12.50,
    "generatedCode": "const cache = new Map();\n...",
    "language": "typescript",
    "status": "suggested",
    "sourcePatternId": "pattern-uuid",
    "createdAt": "2026-02-11T12:00:00.000Z"
  }
]
```

### GET /api/v1/optimizations/:orgId

List all optimizations for an organization.

### PATCH /api/v1/optimizations/:id

Update optimization status.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | `string` | ✅ | `applied` or `dismissed` |

### GET /api/v1/optimizations/:id/code

Get the generated code for a specific optimization.

**Response (200):**

```json
{
  "code": "const cache = new Map();\n...",
  "language": "typescript"
}
```

**SDK Example:**

```typescript
const optimizations = await flusk.getOptimizations();
const { code, language } = await flusk.getOptimizationCode(optimizations[0].id);
```

---

## 6. Prompt Templates & Versioning

Manage prompt templates with variables, version history, A/B testing, and rollback.

### Prompt Templates

#### POST /api/v1/prompt-templates

Create a new prompt template.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | `uuid` | ✅ | Organization ID |
| `name` | `string` | ✅ | Template name |
| `description` | `string` | ✅ | Template description |
| `activeVersionId` | `uuid \| null` | ✅ | Currently active version |
| `variables` | `string[]` | ✅ | Variable names (e.g., `["user_query", "context"]`) |

#### GET /api/v1/prompt-templates/:id

Get a prompt template by UUID.

#### GET /api/v1/prompt-templates/org/:orgId

List templates for an organization.

#### PUT /api/v1/prompt-templates/:id

Update a prompt template.

#### DELETE /api/v1/prompt-templates/:id

Delete a prompt template.

#### POST /api/v1/prompt-templates/:id/render

Render a template with variable substitution (uses active version).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variables` | `Record<string, string>` | ✅ | Variable values to substitute |

**Response (200):**

```json
{
  "rendered": "Answer the question: What is TypeScript?",
  "versionId": "version-uuid"
}
```

#### POST /api/v1/prompt-templates/:id/ab-test

Render with A/B test variant selection.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `candidateVersionId` | `uuid` | ✅ | Version to A/B test against active |
| `trafficPercent` | `number` | ✅ | Percentage of traffic for candidate (0-100) |
| `variables` | `Record<string, string>` | ✅ | Variable values |

**Response (200):**

```json
{
  "selectedVersionId": "version-uuid",
  "isCandidate": true,
  "rendered": "...",
  "versionId": "version-uuid"
}
```

**SDK Example:**

```typescript
const result = await flusk.renderPrompt('template-id', {
  user_query: 'What is TypeScript?',
  context: 'Programming languages',
});

// With A/B testing
const abResult = await flusk.renderPrompt(
  'template-id',
  { user_query: 'What is TypeScript?' },
  { candidateVersionId: 'new-version-id', trafficPercent: 20 }
);
```

---

### Prompt Versions

#### POST /api/v1/prompt-versions

Create a new version for a template.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `templateId` | `uuid` | ✅ | Parent template |
| `content` | `string` | ✅ | Prompt text with `{{variable}}` placeholders |
| `status` | `string` | ❌ | `draft`, `active`, `archived`, `rolled-back` |

#### GET /api/v1/prompt-versions/:id

Get a version by UUID.

#### GET /api/v1/prompt-versions/template/:templateId

List all versions for a template.

#### POST /api/v1/prompt-versions/:id/activate

Activate a version (sets it as the template's active version).

**Response (200):**

```json
{ "activated": true, "versionId": "version-uuid" }
```

#### POST /api/v1/prompt-versions/:id/rollback

Roll back to the previous version if metrics indicate regression.

**Response (200):**

```json
{
  "rolledBack": true,
  "reason": "Quality dropped below threshold",
  "newActiveVersionId": "previous-version-uuid"
}
```

#### PATCH /api/v1/prompt-versions/:id/metrics

Report metrics after using a prompt version.

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `quality` | `number` | ✅ | Quality score for this call |
| `latencyMs` | `number` | ✅ | Latency in milliseconds |
| `cost` | `number` | ✅ | Cost in USD |

**SDK Example:**

```typescript
await flusk.reportPromptMetrics('version-id', {
  quality: 0.95,
  latencyMs: 320,
  cost: 0.003,
});
```

---

## 7. Cost Events (SSE)

Real-time cost event streaming via Server-Sent Events.

### GET /api/v1/events/costs

Subscribe to a real-time stream of cost events.

**Why:** Enables live dashboards and alerting for LLM spend.

**Response:** `text/event-stream`

```
: connected

event: call.tracked
data: {"id":"uuid","provider":"openai","model":"gpt-4","cost":0.03,"totalTokens":1000,"timestamp":"2026-02-11T12:00:00.000Z"}

: keepalive
```

Events are emitted whenever a new LLM call is tracked. Keepalive comments sent every 30 seconds.

**JavaScript Example:**

```typescript
const eventSource = new EventSource('http://localhost:3000/api/v1/events/costs');

eventSource.addEventListener('call.tracked', (event) => {
  const data = JSON.parse(event.data);
  console.log(`$${data.cost} spent on ${data.model}`);
});
```

---

## 8. Patterns

Detected repetitive prompt patterns for optimization.

### GET /api/v1/patterns

List patterns with optional filters.

**Query Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `organizationId` | `string` | ❌ | Filter by organization |
| `limit` | `integer` | ❌ | Max results (default: 100, max: 1000) |
| `offset` | `integer` | ❌ | Pagination offset |

**Response (200):**

```json
{
  "patterns": [
    {
      "id": "pattern-uuid",
      "organizationId": "org-uuid",
      "promptHash": "a3f2b8c1...",
      "occurrenceCount": 47,
      "firstSeenAt": "2026-01-15T...",
      "lastSeenAt": "2026-02-11T...",
      "samplePrompts": ["Translate 'hello' to French"],
      "avgCost": 0.00045,
      "totalCost": 0.02115,
      "suggestedConversion": "cache"
    }
  ],
  "total": 1
}
```

### GET /api/v1/patterns/:id

Get a pattern by UUID.

### POST /api/v1/patterns

Create a pattern manually.

---

## 9. GDPR Compliance

### DELETE /api/v1/gdpr/user/:orgId

Right to deletion — hard-delete all data for an organization.

### GET /api/v1/gdpr/user/:orgId/data

Right to data portability — export all organization data.

---

## 10. Health Checks

### GET /health

Liveness probe. Returns `200` if server is running.

```json
{ "status": "ok", "timestamp": "2026-02-11T12:00:00.000Z" }
```

### GET /health/ready

Readiness probe. Returns `200` if server can handle requests (DB + Redis connected).

```json
{
  "status": "ready",
  "checks": { "database": "ok", "redis": "ok" },
  "timestamp": "2026-02-11T12:00:00.000Z"
}
```
