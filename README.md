<p align="center">
  <h1 align="center">Flusk</h1>
  <p align="center"><strong>Flusk doesn't just show you the problem. It writes the fix.</strong></p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#features">Features</a> •
    <a href="#how-it-works">How It Works</a> •
    <a href="#api-reference">API</a> •
    <a href="#self-hosting">Self-Hosting</a>
  </p>
</p>

---

## What is Flusk?

Flusk is an open-source LLM cost optimization platform. It automatically tracks every LLM API call via OpenTelemetry auto-instrumentation — **zero code changes required**. It detects wasteful patterns (duplicate prompts, overqualified models) and generates code fixes that reduce your bill.

## Features

- **Zero-Touch LLM Tracking** — `node --require @flusk/otel` captures all OpenAI/Anthropic calls automatically
- **Semantic Similarity Detection** — pgvector-powered duplicate/near-duplicate prompt detection
- **Automatic Model Routing** — route prompts to cheaper models when quality permits
- **Agentic Workflow Tracking** — traces and spans for multi-step LLM workflows
- **Code Generation** — auto-generated optimization code (caching, model swaps, dedup)
- **Prompt Versioning & A/B Testing** — version templates, render with variables, compare performance
- **Real-Time Cost Events** — SSE stream of cost data as calls happen

## Quick Start

### 1. Set up Flusk server

```bash
git clone https://github.com/AdirBenYossef/flusk.git
cd flusk
cp .env.example .env
docker compose up              # PostgreSQL + Redis + Flusk on :3000
```

### 2. Install the OTel package in your app

```bash
npm install @flusk/otel
```

### 3. Add one flag to your start command

```json
{
  "scripts": {
    "start": "node --require @flusk/otel ./index.js"
  }
}
```

### 4. Set environment variables

```bash
FLUSK_API_KEY=your-flusk-api-key
FLUSK_ENDPOINT=http://localhost:3000
FLUSK_PROJECT_NAME=my-app
```

**That's it.** Your LLM calls are now tracked automatically. No code changes needed.

```typescript
// Your code stays exactly the same — no wrappers, no imports
import OpenAI from 'openai';
const openai = new OpenAI();

const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
// Flusk captures this automatically via OTel ✨
```

## How It Works

Flusk uses OpenTelemetry auto-instrumentation (`@opentelemetry/instrumentation-openai`) to capture all LLM API calls without touching your code. Traces are sent to Flusk's OTLP endpoint where they're parsed, analyzed, and stored.

```
Your App (unchanged)
  │ node --require @flusk/otel
  │ ↓ auto-instruments OpenAI/Anthropic/HTTP
  │
  │ OTLP/HTTP traces
  ▼
Flusk Server (POST /v1/traces)
  → Parse GenAI semantic conventions
  → Extract: model, tokens, cost, latency, content
  → Store, detect patterns, generate optimizations
```

## Programmatic SDK

For features like model routing and prompt versioning, use `@flusk/sdk`:

```typescript
import { FluskClient } from '@flusk/sdk';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
});

// Model routing
const result = await flusk.route({
  ruleId: 'my-rule',
  prompt: 'Summarize this article...',
  tokenCount: 500,
  originalModel: 'gpt-4',
});

// Prompt versioning
const rendered = await flusk.renderPrompt('summarize-v2', {
  article: 'The quick brown fox...',
});
```

## Architecture

```
flusk/
├── packages/
│   ├── otel/             # @flusk/otel — zero-touch OTel auto-instrumentation
│   ├── entities/         # TypeBox schemas — single source of truth
│   ├── types/            # Derived TS types (Insert, Update, Query)
│   ├── business-logic/   # Pure functions, no I/O, no side effects
│   ├── resources/        # DB repositories, migrations, clients (pg, Redis)
│   ├── execution/        # Fastify app: routes, plugins, hooks, OTLP ingestion
│   ├── sdk/node/         # Client SDK (routing, prompts, optimizations)
│   └── cli/              # Code generators, validators
├── server.ts             # Entry point
├── docker-compose.yml    # One-command local dev
└── Dockerfile            # Multi-stage production build
```

## API Reference

All routes are prefixed with `/api/v1` except OTLP ingestion (`/v1/traces`).

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/v1/traces` | OTLP trace ingestion (OpenTelemetry) |
| `POST` | `/api/v1/llm-calls` | Record an LLM call |
| `GET` | `/api/v1/llm-calls/:id` | Get call by ID |
| `GET` | `/api/v1/patterns` | List detected patterns |
| `POST` | `/api/v1/route` | Route a prompt to optimal model |
| `GET` | `/api/v1/optimizations` | List optimization suggestions |
| `GET` | `/api/v1/prompt-templates` | List templates |
| `GET` | `/api/v1/events/costs` | SSE stream of real-time cost events |

See [API Reference](./docs/api-reference.md) for full documentation.

## Self-Hosting

```bash
git clone https://github.com/AdirBenYossef/flusk.git
cd flusk
cp .env.example .env
docker compose up -d
```

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://flusk:...@localhost:5432/flusk` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `FLUSK_API_KEY` | `test_org_key` | API authentication key |
| `PORT` | `3000` | Server port |

## License

[MIT](LICENSE) © Adir Ben Yossef 2026
