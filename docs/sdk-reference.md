# Flusk SDK Reference

Flusk provides two packages:

- **`@flusk/otel`** — Zero-touch OpenTelemetry auto-instrumentation (primary)
- **`@flusk/sdk`** — Programmatic API access for routing, optimizations, prompts, and tracing

---

## @flusk/otel

Zero-code LLM observability via OpenTelemetry auto-instrumentation.

### Installation

```bash
npm install @flusk/otel
```

### Usage

Add `--require @flusk/otel` to your Node.js start command:

```json
{
  "scripts": {
    "start": "node --require @flusk/otel ./index.js"
  }
}
```

Or import at the top of your entry file:

```typescript
import '@flusk/otel';
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLUSK_API_KEY` | ✅ | — | Flusk API key for authentication |
| `FLUSK_ENDPOINT` | ❌ | `https://otel.flusk.dev` | OTLP endpoint URL |
| `FLUSK_PROJECT_NAME` | ❌ | `default` | Service/project name in traces |
| `FLUSK_CAPTURE_CONTENT` | ❌ | `true` | Capture prompt/response content |

### What it captures

- All OpenAI API calls (via `@opentelemetry/instrumentation-openai`)
- All HTTP calls (via `@opentelemetry/instrumentation-undici`)
- Model, tokens (prompt/completion), latency, finish reason
- Request/response content (when `FLUSK_CAPTURE_CONTENT=true`)

### Programmatic API

```typescript
import { loadConfig, createSdk } from '@flusk/otel';

const config = loadConfig();
const sdk = createSdk(config);
sdk.start();
```

---

## @flusk/sdk — FluskClient

Programmatic API access for routing, optimizations, prompts, and tracing.

### Installation

```bash
npm install @flusk/sdk
```

### Constructor

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000', // default: https://api.flusk.ai
});
```

---

### `getSuggestions(organizationId?)`

Get conversion suggestions for optimizing LLM calls.

**Returns:** `Promise<ConversionSuggestion[]>`

```typescript
const suggestions = await flusk.getSuggestions('org-uuid');
```

---

### `route(options)`

Ask Flusk which model to use for a given prompt.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `options.ruleId` | `string` | ✅ | Routing rule UUID |
| `options.prompt` | `string` | ✅ | Prompt text |
| `options.tokenCount` | `number` | ✅ | Estimated token count |
| `options.originalModel` | `string` | ✅ | Original model |

**Returns:** `Promise<RouteResult>` — `{ selectedModel, reason, complexity, expectedQuality }`

```typescript
const result = await flusk.route({
  ruleId: 'rule-uuid',
  prompt: 'What is 2+2?',
  tokenCount: 10,
  originalModel: 'gpt-4',
});
```

---

### `getOptimizations()`

Generate optimization suggestions.

**Returns:** `Promise<OptimizationSuggestion[]>`

---

### `getOptimizationCode(id)`

Get generated code for a specific optimization.

**Returns:** `Promise<{ code: string; language: string }>`

---

### `renderPrompt(templateId, variables, abTest?)`

Render a prompt template with variable substitution. Optionally run A/B test.

**Returns:** `Promise<{ rendered: string; versionId: string; isCandidate?: boolean }>`

```typescript
const { rendered } = await flusk.renderPrompt('tpl-uuid', {
  user_query: 'What is TypeScript?',
});
```

---

### `reportPromptMetrics(versionId, metrics)`

Report quality/latency/cost metrics after using a prompt version.

```typescript
await flusk.reportPromptMetrics('version-uuid', {
  quality: 0.92,
  latencyMs: 450,
  cost: 0.003,
});
```

---

## Tracing API

```typescript
import { startTrace } from '@flusk/sdk';

const trace = startTrace({
  apiKey: 'key',
  baseUrl: 'http://localhost:3000',
  organizationId: 'org-uuid',
}, 'my-agent-workflow');

await trace.start();

const span = trace.span('generate-response', { type: 'llm' });
await span.start();
await span.end({ output: 'result', cost: 0.002, tokens: 150 });

await trace.end();
```

---

## Standalone Routing

```typescript
import { route } from '@flusk/sdk';

const result = await route('http://localhost:3000', 'api-key', {
  ruleId: 'rule-uuid',
  prompt: 'Hello',
  tokenCount: 5,
  originalModel: 'gpt-4',
});
```
