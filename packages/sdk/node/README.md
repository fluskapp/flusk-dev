# @flusk/sdk

Node.js SDK for programmatic access to Flusk APIs.

## Primary Integration: OTel

For most use cases, use `@flusk/otel` instead of this SDK:

```bash
node --import @flusk/otel ./app.js
```

This auto-instruments all LLM calls via OpenTelemetry — no code changes needed.
See [`@flusk/otel`](../otel/README.md) for details.

## SDK Usage

The SDK is for programmatic access to Flusk APIs (querying data, managing budgets, CI integration):

```typescript
import { FluskClient } from '@flusk/sdk'

const flusk = new FluskClient({
  apiKey: 'flusk_xxx',
  baseUrl: 'http://localhost:3000',
})
```

### Manual Tracking

```typescript
await flusk.track({
  provider: 'openai',
  model: 'gpt-4o',
  prompt: 'What is 2+2?',
  response: '4',
  promptTokens: 10,
  completionTokens: 5,
  totalTokens: 15,
  cost: 0.00015,
  latencyMs: 250,
})
```

### Conversion Suggestions

```typescript
const suggestions = await flusk.getSuggestions()

suggestions.forEach((s) => {
  console.log(`${s.callSignature}: ${s.frequency} calls, $${s.potentialSavings} savings`)
})
```

## API Reference

### FluskClient

#### Constructor

```typescript
new FluskClient(config: FluskClientConfig)
```

- `config.apiKey` (required): Flusk API key
- `config.baseUrl` (optional): Flusk API URL (defaults to `https://api.flusk.ai`)

#### Methods

- `track(llmCall: LLMCallData): Promise<void>` — Track an LLM call
- `getSuggestions(organizationId?: string): Promise<ConversionSuggestion[]>` — Get optimization suggestions
