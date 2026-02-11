# Flusk SDK Reference

The Flusk Node.js SDK (`@flusk/sdk`) provides client wrappers for automatic LLM call tracking, model routing, prompt template management, and distributed tracing.

## Installation

```bash
npm install @flusk/sdk
```

## Exports

```typescript
import {
  FluskClient,        // Main client class
  wrapOpenAI,         // OpenAI wrapper
  wrapAnthropic,      // Anthropic wrapper
  route,              // Standalone routing function
  startTrace,         // Create a new trace
  Trace,              // Trace class
  Span,               // Span class
} from '@flusk/sdk';
```

---

## FluskClient

The main client for interacting with the Flusk API.

### Constructor

```typescript
new FluskClient(config: FluskClientConfig)
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.apiKey` | `string` | ✅ | Your Flusk API key |
| `config.baseUrl` | `string` | ❌ | Flusk server URL (default: `https://api.flusk.ai`) |

**Example:**

```typescript
const flusk = new FluskClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000',
});
```

---

### `track(llmCall)`

Track an LLM API call for analysis and optimization.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `llmCall.provider` | `'openai' \| 'anthropic' \| 'other'` | ✅ | LLM provider |
| `llmCall.model` | `string` | ✅ | Model identifier |
| `llmCall.prompt` | `string` | ✅ | Full prompt text |
| `llmCall.response` | `string` | ✅ | Full response text |
| `llmCall.promptTokens` | `number` | ✅ | Input token count |
| `llmCall.completionTokens` | `number` | ✅ | Output token count |
| `llmCall.totalTokens` | `number` | ✅ | Total tokens |
| `llmCall.cost` | `number` | ❌ | Cost in USD (auto-calculated if omitted) |
| `llmCall.latencyMs` | `number` | ✅ | Response time in ms |
| `llmCall.organizationId` | `string` | ❌ | Organization ID |
| `llmCall.metadata` | `Record<string, unknown>` | ❌ | Custom metadata |

**Returns:** `Promise<void>`

**Throws:** `Error` if the API request fails.

**Example:**

```typescript
await flusk.track({
  provider: 'openai',
  model: 'gpt-4',
  prompt: 'What is TypeScript?',
  response: 'TypeScript is a typed superset of JavaScript...',
  promptTokens: 8,
  completionTokens: 45,
  totalTokens: 53,
  latencyMs: 820,
  metadata: { userId: 'user-123', feature: 'chat' },
});
```

**Notes:**
- This method is fire-and-forget safe — wrap in `.catch()` if you don't want tracking errors to crash your app.
- The server automatically computes prompt hash, cost, and triggers pattern detection.

---

### `getSuggestions(organizationId?)`

Get conversion suggestions for optimizing LLM calls.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `organizationId` | `string` | ❌ | Filter by organization |

**Returns:** `Promise<ConversionSuggestion[]>`

Each suggestion includes:

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Suggestion UUID |
| `callSignature` | `string` | Pattern signature |
| `frequency` | `number` | How often this pattern occurs |
| `totalCost` | `number` | Total cost of this pattern |
| `potentialSavings` | `number` | Estimated savings if optimized |
| `confidence` | `number` | Confidence score 0-1 |
| `suggestedAutomation` | `string` | Suggested approach |
| `status` | `string` | `pending`, `approved`, `rejected`, `implemented` |

**Example:**

```typescript
const suggestions = await flusk.getSuggestions('org-uuid');
for (const s of suggestions) {
  console.log(`${s.suggestedAutomation}: saves $${s.potentialSavings}/month`);
}
```

---

### `route(options)`

Ask Flusk which model to use for a given prompt.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.ruleId` | `string` | ✅ | Routing rule UUID |
| `options.prompt` | `string` | ✅ | Prompt text to classify |
| `options.tokenCount` | `number` | ✅ | Estimated token count |
| `options.originalModel` | `string` | ✅ | Model originally intended |

**Returns:** `Promise<RouteResult>`

| Field | Type | Description |
|-------|------|-------------|
| `selectedModel` | `string` | Model Flusk recommends |
| `reason` | `string` | Why this model was chosen |
| `complexity` | `string` | `simple`, `medium`, or `complex` |
| `expectedQuality` | `number` | Expected quality score 0-1 |

**Example:**

```typescript
const result = await flusk.route({
  ruleId: 'rule-uuid',
  prompt: 'What is 2+2?',
  tokenCount: 10,
  originalModel: 'gpt-4',
});

if (result.selectedModel !== 'gpt-4') {
  console.log(`Downgrading to ${result.selectedModel} (${result.reason})`);
}
```

**Notes:**
- Returns the original model as `selectedModel` if no cheaper alternative meets the quality threshold.
- The routing decision is logged server-side for analytics.

---

### `getOptimizations()`

Generate and retrieve optimization suggestions.

**Returns:** `Promise<OptimizationSuggestion[]>`

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Optimization UUID |
| `type` | `string` | `cache-config`, `model-swap`, `prompt-dedup`, `batch-merge` |
| `title` | `string` | Human-readable title |
| `description` | `string` | Detailed description |
| `estimatedSavingsPerMonth` | `number` | Estimated monthly savings in USD |
| `generatedCode` | `string` | Ready-to-use code snippet |
| `language` | `string` | `typescript`, `python`, or `json` |
| `status` | `string` | `suggested`, `applied`, `dismissed` |

**Example:**

```typescript
const optimizations = await flusk.getOptimizations();
console.log(`Found ${optimizations.length} optimization opportunities`);
```

---

### `getOptimizationCode(id)`

Get the generated code for a specific optimization.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | ✅ | Optimization UUID |

**Returns:** `Promise<{ code: string; language: string }>`

**Example:**

```typescript
const { code, language } = await flusk.getOptimizationCode('opt-uuid');
console.log(`${language}:\n${code}`);
```

---

### `renderPrompt(templateId, variables, abTest?)`

Render a prompt template with variable substitution. Optionally run A/B test.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `templateId` | `string` | ✅ | Template UUID |
| `variables` | `Record<string, string>` | ✅ | Variable values to substitute |
| `abTest` | `object` | ❌ | A/B test configuration |
| `abTest.candidateVersionId` | `string` | ✅ | Version to test |
| `abTest.trafficPercent` | `number` | ✅ | % traffic for candidate (0-100) |

**Returns:** `Promise<{ rendered: string; versionId: string; isCandidate?: boolean }>`

**Example:**

```typescript
// Simple render
const { rendered, versionId } = await flusk.renderPrompt('tpl-uuid', {
  user_query: 'What is TypeScript?',
  context: 'Programming help',
});

// With A/B testing (20% traffic to new version)
const result = await flusk.renderPrompt(
  'tpl-uuid',
  { user_query: 'What is TypeScript?' },
  { candidateVersionId: 'new-version-uuid', trafficPercent: 20 }
);
console.log(`Using ${result.isCandidate ? 'candidate' : 'control'} version`);
```

---

### `reportPromptMetrics(versionId, metrics)`

Report quality/latency/cost metrics after using a prompt version. Used for A/B test evaluation and auto-rollback.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `versionId` | `string` | ✅ | Prompt version UUID |
| `metrics.quality` | `number` | ✅ | Quality score (e.g., 0-1) |
| `metrics.latencyMs` | `number` | ✅ | Latency in milliseconds |
| `metrics.cost` | `number` | ✅ | Cost in USD |

**Returns:** `Promise<void>`

**Example:**

```typescript
await flusk.reportPromptMetrics('version-uuid', {
  quality: 0.92,
  latencyMs: 450,
  cost: 0.003,
});
```

---

## wrapOpenAI(openai, flusk)

Wraps an OpenAI client to automatically track all `chat.completions.create` calls.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `openai` | `OpenAI` | OpenAI client instance |
| `flusk` | `FluskClient` | Flusk client instance |

**Returns:** `OpenAI` — The same client, with tracking added.

**Supports:** Both streaming and non-streaming requests. Token usage and cost are captured automatically.

**Example:**

```typescript
import OpenAI from 'openai';
import { FluskClient, wrapOpenAI } from '@flusk/sdk';

const flusk = new FluskClient({ apiKey: 'key', baseUrl: 'http://localhost:3000' });
const openai = wrapOpenAI(new OpenAI(), flusk);

// All calls are now automatically tracked
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});

// Streaming also works
const stream = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true,
});
for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content || '');
}
```

**Notes:**
- Tracking errors are caught silently (logged to stderr) — they never interrupt your LLM calls.
- Error responses from the LLM are also tracked with `response: '[ERROR]'`.

---

## wrapAnthropic(anthropic, flusk)

Wraps an Anthropic client to automatically track all `messages.create` calls.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `anthropic` | `Anthropic` | Anthropic client instance |
| `flusk` | `FluskClient` | Flusk client instance |

**Returns:** `Anthropic` — The same client, with tracking added.

**Example:**

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FluskClient, wrapAnthropic } from '@flusk/sdk';

const flusk = new FluskClient({ apiKey: 'key', baseUrl: 'http://localhost:3000' });
const anthropic = wrapAnthropic(new Anthropic(), flusk);

const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello' }],
});
```

---

## route(baseUrl, apiKey, options)

Standalone routing function (without creating a FluskClient).

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `baseUrl` | `string` | Flusk server URL |
| `apiKey` | `string` | API key |
| `options` | `RouteOptions` | Same as `FluskClient.route()` |

**Returns:** `Promise<RouteResult>`

---

## startTrace(config, name)

Create a new `Trace` instance.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `config.apiKey` | `string` | ✅ | Flusk API key |
| `config.baseUrl` | `string` | ❌ | Server URL |
| `config.organizationId` | `string` | ✅ | Organization ID |
| `name` | `string` | ✅ | Trace name |

**Returns:** `Trace` (not yet started — call `.start()`)

**Example:**

```typescript
const trace = startTrace({
  apiKey: 'key',
  baseUrl: 'http://localhost:3000',
  organizationId: 'org-uuid',
}, 'my-agent-workflow');

await trace.start();
// ... create spans ...
await trace.end();
```

---

## Trace

Represents a distributed trace (multi-step workflow).

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string \| null` | Trace UUID (set after `.start()`) |

### `trace.start()`

Start the trace (creates it on the server).

**Returns:** `Promise<this>`

### `trace.span(name, options)`

Create a child span.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `name` | `string` | ✅ | Span name |
| `options.type` | `string` | ✅ | `llm`, `tool`, `retrieval`, `chain` |
| `options.parentSpanId` | `string` | ❌ | Parent span for nesting |
| `options.input` | `string` | ❌ | Input data |

**Returns:** `Span` (not yet started)

**Throws:** `Error` if trace hasn't been started.

### `trace.end()`

Complete the trace. Server aggregates cost/token/latency stats from all spans.

**Returns:** `Promise<void>`

---

## Span

Represents a single step within a trace.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string \| null` | Span UUID (set after `.start()`) |

### `span.start()`

Start the span (creates it on the server).

**Returns:** `Promise<this>`

### `span.end(result?)`

Complete the span with optional results.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `result.output` | `string` | ❌ | Output text |
| `result.cost` | `number` | ✅ | Cost in USD |
| `result.tokens` | `number` | ✅ | Token count |

**Returns:** `Promise<void>`

**Throws:** `Error` if span hasn't been started.

**Example:**

```typescript
const span = trace.span('generate-response', {
  type: 'llm',
  input: 'User asked about TypeScript',
});
await span.start();

// ... call LLM ...

await span.end({
  output: 'TypeScript is...',
  cost: 0.002,
  tokens: 150,
});
```
