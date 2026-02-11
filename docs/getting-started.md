# Getting Started with Flusk

Flusk is an LLM cost optimization platform. It automatically tracks your LLM API calls via OpenTelemetry — **zero code changes required** — detects patterns, and suggests cost-saving optimizations.

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **PostgreSQL** 16+ with [pgvector](https://github.com/pgvector/pgvector) extension
- **Redis** 7+

## 1. Install @flusk/otel

```bash
npm install @flusk/otel
```

## 2. Add the --require flag

Update your start script to load Flusk's OTel auto-instrumentation:

```json
{
  "scripts": {
    "start": "node --require @flusk/otel ./index.js"
  }
}
```

## 3. Set environment variables

```bash
FLUSK_API_KEY=your-flusk-api-key
FLUSK_ENDPOINT=http://localhost:3000   # Your Flusk server
FLUSK_PROJECT_NAME=my-app
FLUSK_CAPTURE_CONTENT=true             # Set false for privacy
```

## 4. Use your LLM client normally

```typescript
import OpenAI from 'openai';

// No wrappers, no imports from Flusk — just use OpenAI as normal
const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
// Flusk captures this automatically via OTel ✨
```

Works with Anthropic too:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
// Captured via HTTP-level instrumentation
```

## 5. View tracked calls

```bash
# List detected patterns
curl http://localhost:3000/api/v1/patterns?organizationId=<org-id>

# Get a specific call by ID
curl http://localhost:3000/api/v1/llm-calls/<id>
```

## 6. Set up model routing (optional)

Use `@flusk/sdk` for programmatic API access:

```bash
npm install @flusk/sdk
```

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
});

const result = await flusk.route({
  ruleId: 'my-rule',
  prompt: 'Simple translation task',
  tokenCount: 50,
  originalModel: 'gpt-4',
});

console.log(result.selectedModel); // e.g., 'gpt-4o-mini'
```

## 7. Generate optimizations

```typescript
const optimizations = await flusk.getOptimizations();

for (const opt of optimizations) {
  console.log(`${opt.type}: ${opt.title}`);
  console.log(`  Estimated savings: $${opt.estimatedSavingsPerMonth}/month`);

  const { code } = await flusk.getOptimizationCode(opt.id);
  console.log(code);
}
```

## Next Steps

- [SDK Reference](./sdk-reference.md) — @flusk/otel and @flusk/sdk docs
- [Architecture](./architecture.md) — How Flusk works internally
- [API Reference](./api-reference.md) — Full endpoint documentation
- [Self-Hosting Guide](./self-hosting.md) — Deploy your own Flusk instance
