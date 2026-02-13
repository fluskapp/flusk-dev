<p align="center">
  <h1 align="center">⚡ Flusk</h1>
  <p align="center"><strong>Cut your LLM costs by 50%+ with zero code changes.</strong></p>
  <p align="center">Open-source LLM cost optimization — auto-detects waste, generates fixes.</p>
  <p align="center">
    <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
    <a href="https://github.com/AdirBenYossef/flusk/actions"><img src="https://img.shields.io/github/actions/workflow/status/AdirBenYossef/flusk/ci.yml?branch=main" alt="CI"></a>
    <a href="https://www.npmjs.com/package/@flusk/otel"><img src="https://img.shields.io/npm/v/@flusk/otel.svg" alt="npm"></a>
  </p>
</p>

---

## What is Flusk?

Flusk tracks every LLM API call via OpenTelemetry auto-instrumentation — **zero code changes** — detects wasteful patterns (duplicate prompts, overqualified models), and generates code fixes that shrink your bill.

### Before Flusk vs After Flusk

```diff
- # You have no idea where $12k/month in LLM costs is going
- # Duplicate prompts, GPT-4 doing GPT-3.5 work, no visibility

+ # Add one flag. That's it.
+ node --import @flusk/otel ./index.js
+
+ # ✅ Every LLM call tracked (model, tokens, cost, latency)
+ # ✅ Duplicate prompts detected → cache suggestions generated
+ # ✅ Overqualified models flagged → routing rules auto-created
+ # ✅ Real-time cost dashboard with SSE events
```

## 🚀 Quick Start

### 1. Start the Flusk server

```bash
git clone https://github.com/AdirBenYossef/flusk.git
cd flusk && cp .env.example .env
docker compose up -d    # PostgreSQL + Redis + Jaeger + Flusk on :3000
```

Verify it's running:
```bash
curl http://localhost:3000/health        # → { "status": "ok" }
curl http://localhost:3000/docs          # → Swagger UI
```

### 2. Instrument your app (zero code changes)

```bash
npm install @flusk/otel
```

Set environment variables:
```bash
export FLUSK_ENDPOINT=http://localhost:3000
export FLUSK_API_KEY=your_api_key        # optional for local dev
export FLUSK_PROJECT_NAME=my-app         # optional, default: "default"
```

Start your app with the OTel flag:
```bash
node --import @flusk/otel ./index.js
```

Or add to `package.json`:
```json
{ "scripts": { "start": "node --import @flusk/otel ./index.js" } }
```

That's it — **every OpenAI, Anthropic, and Bedrock call is now tracked automatically.**

### 3. View your data

```bash
# Terminal dashboard
pnpm tsx packages/cli/bin/flusk.ts dashboard

# Or use Swagger API
open http://localhost:3000/docs

# Or view raw traces in Jaeger
open http://localhost:16686
```

### 4. Environment variables reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLUSK_ENDPOINT` | ✅ | `https://otel.flusk.dev` | Flusk server URL |
| `FLUSK_API_KEY` | No | — | API key for authenticated traces |
| `FLUSK_PROJECT_NAME` | No | `default` | Project name for grouping |
| `FLUSK_CAPTURE_CONTENT` | No | `true` | Capture prompt/response content |

### 5. Supported providers (auto-detected)

| Provider | Package | Instrumentation |
|----------|---------|-----------------|
| OpenAI | `openai` | `@opentelemetry/instrumentation-openai` |
| Anthropic | `@anthropic-ai/sdk` | `@traceloop/instrumentation-anthropic` |
| AWS Bedrock | `@aws-sdk/client-bedrock-runtime` | `@traceloop/instrumentation-bedrock` |

> **Adding a new provider?** `pnpm tsx packages/cli/bin/flusk.ts g:provider <name>` scaffolds pricing, span config, and tests.

## ✨ Features

- ✅ **Zero-Touch Tracking** — `--import @flusk/otel` auto-instruments OpenAI, Anthropic, Bedrock
- ✅ **Duplicate Detection** — pgvector semantic similarity finds repeated/near-identical prompts
- ✅ **Model Routing** — auto-route prompts to cheaper models when quality permits
- ✅ **Code Generation** — generates caching, model swap, and dedup code for you
- ✅ **Prompt Versioning** — version templates, A/B test, compare performance
- ✅ **Real-Time Events** — SSE stream of cost data as calls happen
- ✅ **Self-Hosted** — your data stays on your infrastructure

## 🏗️ Architecture

```
Your App (unchanged code)
  │ node --import @flusk/otel
  ▼
┌────────────────────────────────────────┐
│  Flusk Server (Fastify)                │
│  ┌──────────┐  ┌───────────────────┐   │
│  │ OTLP     │→ │ Pattern Detection │   │
│  │ Ingestion│  │ (pgvector)        │   │
│  └──────────┘  └───────────────────┘   │
│  ┌──────────┐  ┌───────────────────┐   │
│  │ Model    │  │ Code Generation   │   │
│  │ Routing  │  │ (Optimizations)   │   │
│  └──────────┘  └───────────────────┘   │
│          PostgreSQL + Redis            │
└────────────────────────────────────────┘
```

## 📊 Comparison

| Feature | Flusk | Helicone | Langfuse | Portkey |
|---------|-------|----------|----------|---------|
| Zero-code instrumentation | ✅ OTel | ⚠️ Proxy | ⚠️ SDK | ⚠️ Proxy |
| Self-hosted | ✅ | ✅ | ✅ | ❌ |
| Auto-generates fixes | ✅ | ❌ | ❌ | ❌ |
| Semantic dedup detection | ✅ | ❌ | ❌ | ❌ |
| Model routing | ✅ | ❌ | ❌ | ✅ |
| Open source | ✅ MIT | ✅ | ✅ | Partial |

## 🗂️ Monorepo Structure

```
packages/
  otel/             @flusk/otel — zero-touch OTel auto-instrumentation
  entities/         TypeBox schemas — single source of truth
  types/            Derived TS types (Insert, Update, Query)
  business-logic/   Pure functions, no I/O
  resources/        DB repositories, migrations (pg, Redis)
  execution/        Fastify app: routes, plugins, OTLP ingestion
  cli/              Code generators, validators
```

## 📖 Examples

- [`examples/openai-node/`](./examples/openai-node/) — OpenAI with zero-touch tracking
- [`examples/anthropic-node/`](./examples/anthropic-node/) — Anthropic with zero-touch tracking
- [`examples/bedrock-node/`](./examples/bedrock-node/) — AWS Bedrock with zero-touch tracking

## 🔥 Performance Profiling

Flusk integrates [`@platformatic/flame`](https://github.com/platformatic/flame) for CPU profiling and flamegraph generation.

```bash
# Scaffold profiling config
flusk g:profile

# Profile your server (default 30s)
flusk profile run ./dist/index.js --duration 60

# Generate flamegraph from pprof output
flusk profile generate ./profiles/cpu.pprof

# View hotspot summary
flusk profile analyze ./profiles/cpu.md
```

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for setup instructions and guidelines.

## 📄 License

[MIT](LICENSE) © Adir Ben Yossef 2026
