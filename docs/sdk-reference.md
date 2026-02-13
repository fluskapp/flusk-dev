# Flusk SDK Reference

## @flusk/otel

Zero-code LLM observability via OpenTelemetry auto-instrumentation.

### Installation

```bash
npm install @flusk/otel
```

### Usage

```json
{
  "scripts": {
    "start": "node --import @flusk/otel ./index.js"
  }
}
```

Or import directly:

```typescript
import '@flusk/otel';
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLUSK_API_KEY` | ✅ | — | API key |
| `FLUSK_ENDPOINT` | No | `https://otel.flusk.dev` | OTLP endpoint |
| `FLUSK_PROJECT_NAME` | No | `default` | Service name |
| `FLUSK_CAPTURE_CONTENT` | No | `true` | Capture content |
| `FLUSK_PROFILE_MODE` | No | `auto` | Profiling mode |
| `FLUSK_LOG_LEVEL` | No | `info` | Log level |

### What It Captures

- OpenAI API calls (via `@opentelemetry/instrumentation-openai`)
- HTTP calls (via `@opentelemetry/instrumentation-undici`)
- Model, tokens, latency, finish reason, content

### Programmatic API

```typescript
import { loadConfig, createSdk } from '@flusk/otel';
const config = loadConfig();
const sdk = createSdk(config);
sdk.start();
```

---

## @flusk/sdk — FluskClient

### Installation

```bash
npm install @flusk/sdk
```

### Constructor

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-api-key',
  baseUrl: 'http://localhost:3000',
});
```

### `getSuggestions(organizationId?)`

Returns `Promise<ConversionSuggestion[]>`.

### `route(options)`

Ask which model to use for a given prompt.

```typescript
const result = await flusk.route({
  ruleId: 'rule-uuid',
  prompt: 'What is 2+2?',
  tokenCount: 10,
  originalModel: 'gpt-4',
});
// result.selectedModel → 'gpt-4o-mini'
```

### `getOptimizations()` / `getOptimizationCode(id)`

Generate and retrieve optimization code snippets.

### `renderPrompt(templateId, variables, abTest?)`

Render a prompt template with variable substitution.

### `reportPromptMetrics(versionId, metrics)`

Report quality/latency/cost metrics for a prompt version.

### Profile Endpoints

```typescript
// List profile sessions
const profiles = await flusk.getProfiles(orgId);

// Get correlations between profiles and LLM calls
const corr = await flusk.getProfileCorrelations(profileId);

// Get optimization suggestions from profiling data
const suggestions = await flusk.getProfileSuggestions(profileId);
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

## @flusk/logger

```typescript
import { getLogger } from '@flusk/logger';

const logger = getLogger().child({ module: 'my-module' });
logger.info({ userId: 42 }, 'user created');
```

Configure via `FLUSK_LOG_LEVEL` and `NODE_ENV`.
