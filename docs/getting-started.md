# Getting Started with Flusk

Flusk is an LLM cost optimization platform. It tracks your LLM API calls, detects patterns (duplicate/similar prompts), and suggests cost-saving optimizations like caching, model downgrade, and prompt deduplication.

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **PostgreSQL** 16+ with [pgvector](https://github.com/pgvector/pgvector) extension
- **Redis** 7+
- **OpenAI API key** (optional, for similarity search and embeddings)

## 1. Install the SDK

```bash
npm install @flusk/sdk
```

Or with your package manager of choice:

```bash
pnpm add @flusk/sdk
yarn add @flusk/sdk
```

## 2. Wrap Your First LLM Call

The fastest way to start tracking is to wrap your existing OpenAI or Anthropic client:

### OpenAI

```typescript
import OpenAI from 'openai';
import { FluskClient, wrapOpenAI } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000', // Your Flusk server
});

const openai = wrapOpenAI(new OpenAI(), flusk);

// Use OpenAI as normal — Flusk tracks every call automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { FluskClient, wrapAnthropic } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
});

const anthropic = wrapAnthropic(new Anthropic(), flusk);

// Use Anthropic as normal — Flusk tracks every call automatically
const message = await anthropic.messages.create({
  model: 'claude-3-opus-20240229',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### Manual Tracking

If you use a different LLM provider, track calls manually:

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
});

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

## 3. View Tracked Calls

Once you've tracked some calls, query them via the API:

```bash
# Get a specific call by ID
curl http://localhost:3000/api/v1/llm-calls/<id>

# Find cached responses by prompt hash
curl http://localhost:3000/api/v1/llm-calls/by-hash/<sha256-hash>

# List detected patterns
curl http://localhost:3000/api/v1/patterns?organizationId=<org-id>
```

## 4. Set Up Model Routing

Model routing lets Flusk choose the cheapest model that meets your quality requirements:

```typescript
// Step 1: Create a routing rule
const ruleResponse = await fetch('http://localhost:3000/api/v1/routing-rules', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer your-key' },
  body: JSON.stringify({
    organizationId: 'your-org-id',
    name: 'Default routing',
    qualityThreshold: 0.8,
    fallbackModel: 'gpt-4',
    enabled: true,
  }),
});
const rule = await ruleResponse.json();

// Step 2: Ask Flusk which model to use
const routeResult = await flusk.route({
  ruleId: rule.id,
  prompt: 'Simple translation task',
  tokenCount: 50,
  originalModel: 'gpt-4',
});

console.log(routeResult.selectedModel); // e.g., 'gpt-4o-mini'
console.log(routeResult.reason);        // e.g., 'cheapest-qualifying'
```

## 5. Create Your First Trace

Traces let you track multi-step AI agent workflows:

```typescript
import { startTrace } from '@flusk/sdk';

const trace = startTrace({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
  organizationId: 'your-org-id',
}, 'customer-support-agent');

await trace.start();

// Track individual steps as spans
const planSpan = trace.span('plan-response', { type: 'llm' });
await planSpan.start();
// ... do LLM call ...
await planSpan.end({ output: 'Plan: greet then help', cost: 0.02, tokens: 150 });

const toolSpan = trace.span('search-knowledge-base', { type: 'tool' });
await toolSpan.start();
// ... call tool ...
await toolSpan.end({ output: '3 results found', cost: 0, tokens: 0 });

// Complete the trace — aggregates stats automatically
await trace.end();
```

## 6. Generate Optimizations

After tracking enough calls, ask Flusk for optimization suggestions:

```typescript
const optimizations = await flusk.getOptimizations();

for (const opt of optimizations) {
  console.log(`${opt.type}: ${opt.title}`);
  console.log(`  Estimated savings: $${opt.estimatedSavingsPerMonth}/month`);
  
  // Get the generated code snippet
  const { code, language } = await flusk.getOptimizationCode(opt.id);
  console.log(`  ${language} code:\n${code}`);
}
```

Optimization types include:
- **cache-config** — Cache identical prompts to avoid redundant API calls
- **model-swap** — Use a cheaper model that achieves the same results  
- **prompt-dedup** — Deduplicate similar prompts
- **batch-merge** — Merge multiple calls into batch requests

## Next Steps

- [API Reference](./api-reference.md) — Full endpoint documentation
- [SDK Reference](./sdk-reference.md) — All SDK methods and classes
- [Architecture](./architecture.md) — How Flusk works internally
- [Self-Hosting Guide](./self-hosting.md) — Deploy your own Flusk instance
