<p align="center">
  <img src="https://raw.githubusercontent.com/adirbenyossef/flusk-dev/main/docs/assets/flusk-logo.png" alt="Flusk" width="200" />
</p>

<h1 align="center">Flusk</h1>

<p align="center">
  <strong>Open-source LLM cost intelligence for Node.js teams.</strong><br />
  <em>Track every call. Find waste. Ship cheaper.</em>
</p>

<p align="center">
  <a href="https://github.com/adirbenyossef/flusk-dev/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/adirbenyossef/flusk-dev/ci.yml?branch=main&style=for-the-badge" alt="CI"></a>
  <a href="https://github.com/adirbenyossef/flusk-dev/releases"><img src="https://img.shields.io/github/v/release/adirbenyossef/flusk-dev?include_prereleases&style=for-the-badge" alt="Release"></a>
  <a href="https://www.npmjs.com/package/@flusk/cli"><img src="https://img.shields.io/npm/v/@flusk/cli?style=for-the-badge&color=cb3837" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/adirbenyossef/flusk-dev/main/docs/assets/demo.gif" alt="Flusk Demo" width="720" />
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#what-you-get">What You Get</a> •
  <a href="#framework-integration-guides">Frameworks</a> •
  <a href="#api-reference">API</a> •
  <a href="#live-monitoring">Live Monitoring</a> •
  <a href="./docs/getting-started.md">Docs</a> •
  <a href="#for-contributors">Contributing</a>
</p>

---

# The Product

## Why Flusk Exists

LLM APIs are a black box of spending. You ship a feature, costs spike, and you don't know why until the invoice hits. Teams waste **20-40% of their LLM budget** on duplicate prompts, wrong model choices, and unoptimized calls — but they have zero visibility.

**Flusk gives you that visibility.** One command, zero config, fully local. Think of it as the missing **cost observability layer** between your app and the LLM providers.

## Quick Start

```bash
npx @flusk/cli analyze ./my-app.js
```

That's it. No accounts, no API keys, no config files. Flusk intercepts every LLM call via [OpenTelemetry](https://opentelemetry.io/), calculates real costs, and prints a report with savings opportunities.

<details>
<summary><strong>See example output</strong></summary>

```
┌─────────────────────────────────────────────────┐
│                 Flusk Cost Report                │
├──────────────┬──────────┬───────────┬────────────┤
│ Model        │ Calls    │ Tokens    │ Cost       │
├──────────────┼──────────┼───────────┼────────────┤
│ gpt-5.2      │ 47       │ 125,340   │ $3.76      │
│ gpt-5.2-mini │ 112      │ 89,200    │ $0.13      │
│ claude-4.6   │ 23       │ 67,800    │ $0.81      │
├──────────────┼──────────┼───────────┼────────────┤
│ Total        │ 182      │ 282,340   │ $4.70      │
└──────────────┴──────────┴───────────┴────────────┘

⚠ Optimization Suggestions:
  → 12 duplicate prompts detected (saving ~$0.89/day)
  → 31 gpt-5.2 calls could use gpt-5.2-mini (saving ~$2.10/day)
  → Consider caching for repeated classification calls

💰 Estimated monthly savings: $89.70
```

</details>

## What You Get

### Cost Tracking

- **Per-model breakdown** — see exactly what each model costs you (OpenAI, Anthropic, AWS Bedrock)
- **Per-call cost** — every LLM call logged with input/output tokens and calculated cost
- **Multi-agent tracking** — label different agents (`--agent customer-support`) and compare spending
- **Historical trends** — browse past analysis sessions and track cost over time

### Waste Detection

- **Duplicate prompt detection** — finds identical or near-identical prompts hitting the API
- **Model downgrade suggestions** — flags calls where a cheaper model would produce the same quality
- **Token waste analysis** — identifies oversized prompts and unnecessary system messages
- **Pattern detection** — surfaces recurring cost patterns across your codebase

### Budget Controls

- **Daily & monthly limits** — set spending caps and get alerts before you blow the budget
- **Per-call thresholds** — flag any single call above a cost limit
- **Webhook alerts** — push budget notifications to Slack, PagerDuty, or any HTTP endpoint
- **CI integration** — fail builds that exceed cost budgets

### Live Monitoring

Flusk isn't just a one-shot analyzer. In **server mode** or with the **TUI dashboard**, you get real-time visibility into your LLM operations as they happen.

#### What you see in real-time

| Metric | Description | Why it matters |
|--------|-------------|----------------|
| **Cost per second** | Rolling cost rate across all models | Spot runaway loops instantly |
| **Active calls** | Currently in-flight LLM requests | See concurrency and queuing issues |
| **Token throughput** | Input/output tokens per minute | Understand prompt efficiency |
| **Model distribution** | Which models are being called right now | Catch wrong model usage live |
| **Duplicate rate** | % of prompts that are near-duplicates | Find caching opportunities in real-time |
| **Latency (p50/p95/p99)** | Response time per model | Detect provider degradation |
| **Budget burn rate** | Projected daily/monthly spend at current pace | Know if you'll blow budget before you do |
| **Error rate** | Failed/retried LLM calls | Catch API issues before users notice |

#### Key Use Cases

**🔍 Debug a cost spike in production**
Your bill doubled overnight. Run Flusk against your production app and immediately see which agent, model, or endpoint is responsible. Filter by agent label to isolate the problem.

**🚨 Catch runaway AI agents**
An autonomous agent stuck in a loop can burn hundreds of dollars in minutes. Flusk's budget alerts + live cost-per-second monitoring catch this before it gets expensive.

**📊 Compare model performance before switching**
Thinking about moving from GPT-5.2 to Claude Sonnet 4.5? Run both side by side with Flusk, compare cost, latency, and token usage per call. Make data-driven model decisions.

**🔄 Optimize prompt caching**
Flusk detects duplicate and near-duplicate prompts automatically. See exactly which prompts repeat, how often, and how much you'd save with caching. Then implement caching and verify the savings.

**👥 Multi-agent cost allocation**
Running multiple AI agents (support bot, content writer, code assistant)? Label each with `--agent` and get per-agent cost breakdowns. Allocate LLM spend to the right team or product.

**⚡ CI cost gates**
Add Flusk to your CI pipeline. If a PR introduces a new LLM call pattern that exceeds your cost budget, the build fails. Prevent cost regressions before they ship.

**📈 Track cost trends over time**
Browse historical analysis sessions. See if your optimizations actually reduced costs. Spot gradual cost creep before it becomes a problem.

### Reports & Dev Tools

Flusk generates reports in multiple formats so they fit your existing workflow:

| Format | Command | Use Case |
|--------|---------|----------|
| **Terminal** | `flusk analyze ./app.js` | Quick local check |
| **Markdown** | `flusk report --format markdown` | PR comments, docs |
| **JSON** | `flusk report --format json` | CI pipelines, scripts |
| **TUI Dashboard** | `flusk dashboard` | Real-time interactive monitoring |

The **TUI dashboard** has 7 screens: Overview, Patterns, Suggestions, Profile, Budget, Models, and History — all navigable via keyboard.

**Export & integrate** your reports:

```bash
# Write report to file
flusk analyze ./app.js -o report.md -f markdown

# JSON for CI pipelines
flusk analyze ./app.js -o report.json -f json

# Compare agents
flusk report --compare customer-support content-writer
```

### Observability Integrations

Export LLM cost data to your existing observability stack. All integrations use standard OTLP — no vendor lock-in.

| Platform | Status | Setup |
|----------|--------|-------|
| **Grafana Tempo** | ✅ Supported | `FLUSK_EXPORT=grafana FLUSK_GRAFANA_API_KEY=xxx` |
| **Datadog** | ✅ Supported | `FLUSK_EXPORT=datadog FLUSK_DATADOG_API_KEY=xxx` |
| **New Relic** | ✅ Supported | `FLUSK_EXPORT=newrelic FLUSK_NEWRELIC_API_KEY=xxx` |
| **Custom OTLP** | ✅ Supported | `FLUSK_EXPORT=custom FLUSK_CUSTOM_ENDPOINT=http://...` |

Export to multiple platforms simultaneously:

```bash
FLUSK_EXPORT=grafana,datadog \
FLUSK_GRAFANA_API_KEY=xxx \
FLUSK_DATADOG_API_KEY=xxx \
flusk analyze ./app.js
```

Manage integrations via CLI:

```bash
flusk export setup grafana --api-key xxx   # Configure
flusk export test grafana                   # Send test span
flusk export list                           # Show active targets
```

> **Multi-export:** Flusk always writes to local SQLite AND your configured platforms in parallel. You never lose local data.

## API Reference

Flusk exposes a **REST API** in server mode for programmatic access:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/costs/summary` | GET | Aggregate cost breakdown by model |
| `/api/v1/costs/calls` | GET | Individual call log with cost per call |
| `/api/v1/patterns` | GET | Detected patterns (duplicates, waste) |
| `/api/v1/suggestions` | GET | Optimization recommendations |
| `/api/v1/budget/status` | GET | Current budget utilization |
| `/api/v1/sessions` | GET | List analysis sessions |
| `/api/v1/sessions/:id` | GET | Session detail with full call log |
| `/api/v1/models/breakdown` | GET | Per-model statistics and trends |
| `/api/v1/agents` | GET | List tracked agents with cost totals |
| `/api/v1/agents/:name/compare` | GET | Compare two agents side by side |
| `/api/v1/export/otlp` | POST | Push spans to external OTLP endpoint |

**Authentication:** API key via `X-Flusk-Key` header or `FLUSK_API_KEY` env var.

```bash
# Example: get cost summary
curl -H "X-Flusk-Key: $FLUSK_API_KEY" http://localhost:3000/api/v1/costs/summary
```

> **CLI mode** (default) doesn't need the API — everything runs locally via SQLite. The API is available when you opt into **server mode** for team use.

## How It Works

```
Your App (unchanged)
    │
    │  node --import @flusk/otel
    ▼
OpenTelemetry Auto-Instrumentation
    │  intercepts OpenAI / Anthropic / Bedrock HTTP calls
    ▼
Local Analysis Engine
    │  cost calculation, pattern detection, suggestions
    ▼
┌────────────────────────────────────────────────┐
│  SQLite (CLI mode)  │  Postgres (Server mode)  │
└────────────────────────────────────────────────┘
    │
    ▼
Reports (stdout / markdown / json / TUI dashboard)
    │
    ▼  (optional, parallel)
OTLP Export → Grafana Tempo / Datadog / New Relic / Custom
```

**Zero intrusion.** No wrappers, no monkey-patching, no SDK to import. Flusk hooks into the Node.js runtime via OpenTelemetry auto-instrumentation and captures LLM calls at the HTTP layer. Your code stays unchanged.

## Supported Providers

| Provider | Models | Status |
|----------|--------|--------|
| **OpenAI** | GPT-5.2, GPT-5.1, GPT-5.2-mini, o3-pro, o3-mini | ✅ Supported |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.5, Sonnet 4, Haiku 3.5 | ✅ Supported |
| **AWS Bedrock** | All Bedrock-hosted models | ✅ Supported |
| **Azure OpenAI** | All Azure-hosted OpenAI models | 🔜 Planned |
| **Google Vertex AI** | Gemini models | 🔜 Planned |

## CLI Commands

```bash
# Analysis
flusk analyze <script>           # Run script and analyze LLM costs
flusk analyze ./app.js --agent bot  # Track with agent label
flusk analyze ./app.js -d 120    # Run for 120 seconds

# Reports
flusk report [id]                # View or regenerate a report
flusk report --format json       # JSON output for CI
flusk report --compare agent1 agent2  # Side-by-side comparison
flusk history                    # List past analysis sessions

# Budget
flusk budget                     # Check budget status
flusk init                       # Create .flusk.config.js

# Dashboard
flusk dashboard                  # Interactive TUI (7 screens)

# Integrations
flusk export setup <platform>    # Configure Grafana/Datadog/New Relic
flusk export test <platform>     # Send test span
flusk export list                # Show active export targets
```

## Configuration

Optional. Flusk works with zero config. For teams that want budget controls:

```javascript
// .flusk.config.js
export const config = {
  budget: {
    daily: 10.00,
    monthly: 200.00,
    perCallThreshold: 0.50,
    duplicateRatioAlert: 0.20,
  },
  alerts: {
    onBudgetExceeded: 'warn',
    webhook: 'https://hooks.slack.com/...',
  },
  agent: 'my-bot',
};
```

## Server Mode (Teams)

For persistent monitoring across your team with Postgres + Redis:

```bash
docker compose up -d
export FLUSK_ENDPOINT=http://localhost:3000
node --import @flusk/otel ./index.js
```

See the [Self-Hosting Guide](./docs/self-hosting.md).

## Framework Integration Guides

Flusk works with **any Node.js app** — no code changes required. Here's how to set it up with popular frameworks:

### Express

```bash
# One-shot analysis
flusk analyze ./server.js

# Or instrument your existing start command
node --import @flusk/otel ./server.js
```

```typescript
// server.ts — your code stays EXACTLY the same
import express from 'express';
import OpenAI from 'openai';

const app = express();
const openai = new OpenAI();

app.post('/api/chat', async (req, res) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: req.body.messages,
  });
  res.json(completion);
});

app.listen(3000);
// Flusk captures every OpenAI call automatically via OTel.
// No imports, no wrappers, no middleware needed.
```

### Fastify

```bash
node --import @flusk/otel ./server.js
```

```typescript
// server.ts
import Fastify from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

const app = Fastify({ logger: true });
const anthropic = new Anthropic();

app.post('/api/summarize', async (request, reply) => {
  const result = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 1024,
    messages: [{ role: 'user', content: request.body.text }],
  });
  return result;
});

await app.listen({ port: 3000 });
// Zero config. Flusk hooks into HTTP layer via OpenTelemetry.
```

### NestJS

```bash
# In your package.json, update your start command:
# "start": "node --import @flusk/otel dist/main.js"
node --import @flusk/otel dist/main.js
```

```typescript
// chat.service.ts — no changes needed
@Injectable()
export class ChatService {
  private openai = new OpenAI();

  async chat(messages: ChatMessage[]): Promise<string> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-5.2-mini',
      messages,
    });
    return completion.choices[0].message.content;
  }
}

// Flusk intercepts at the HTTP layer — works with any
// DI container, middleware, or decorator pattern.
```

### Next.js (API Routes / Server Actions)

```bash
# next.config.js — add the OTel loader
# NODE_OPTIONS='--import @flusk/otel' next dev
NODE_OPTIONS='--import @flusk/otel' npx next dev
```

```typescript
// app/api/chat/route.ts — unchanged
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: Request) {
  const { messages } = await req.json();
  const completion = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages,
    stream: true,
  });
  // Flusk captures streamed calls too
  return new Response(completion.toReadableStream());
}
```

### Hono

```bash
node --import @flusk/otel ./src/index.ts
```

```typescript
// src/index.ts
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import Anthropic from '@anthropic-ai/sdk';

const app = new Hono();
const anthropic = new Anthropic();

app.post('/ask', async (c) => {
  const { question } = await c.req.json();
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-3-5-20250620',
    max_tokens: 256,
    messages: [{ role: 'user', content: question }],
  });
  return c.json(msg);
});

serve({ fetch: app.fetch, port: 3000 });
```

### tRPC

```bash
node --import @flusk/otel ./server.ts
```

```typescript
// server.ts — tRPC router, zero changes
import { initTRPC } from '@trpc/server';
import OpenAI from 'openai';

const t = initTRPC.create();
const openai = new OpenAI();

export const appRouter = t.router({
  generate: t.procedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      return openai.chat.completions.create({
        model: 'gpt-5.2-mini',
        messages: [{ role: 'user', content: input.prompt }],
      });
    }),
});
```

### LangChain / LlamaIndex

```bash
# Works out of the box — LangChain uses OpenAI/Anthropic SDKs
# under the hood, which Flusk intercepts at the HTTP layer
node --import @flusk/otel ./agent.js
```

```typescript
// agent.ts — LangChain agent, no changes
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIToolsAgent } from 'langchain/agents';

const llm = new ChatOpenAI({ modelName: 'gpt-5.2' });
const agent = await createOpenAIToolsAgent({ llm, tools, prompt });
const executor = new AgentExecutor({ agent, tools });

// Every LLM call the agent makes is tracked with cost
const result = await executor.invoke({ input: 'Research this topic' });
```

### Docker / Production

```dockerfile
# Dockerfile
FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm install

# Add Flusk instrumentation
ENV NODE_OPTIONS="--import @flusk/otel"
ENV FLUSK_EXPORT=grafana
ENV FLUSK_GRAFANA_API_KEY=your-key

CMD ["node", "dist/server.js"]
```

```yaml
# docker-compose.yml
services:
  api:
    build: .
    environment:
      - NODE_OPTIONS=--import @flusk/otel
      - FLUSK_EXPORT=datadog
      - FLUSK_DATADOG_API_KEY=${DATADOG_API_KEY}
    ports:
      - "3000:3000"
```

### CI / GitHub Actions

```yaml
# .github/workflows/cost-check.yml
name: LLM Cost Check
on: [pull_request]

jobs:
  cost-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22

      - run: npm install
      - run: npx @flusk/cli analyze ./test-app.js -d 30 -f json -o cost-report.json
      - run: |
          # Fail if daily projected cost > $50
          COST=$(jq '.projectedDaily' cost-report.json)
          if (( $(echo "$COST > 50" | bc -l) )); then
            echo "❌ Cost gate failed: projected \$$COST/day"
            exit 1
          fi
          echo "✅ Cost gate passed: projected \$$COST/day"
```

> **The key insight:** `--import @flusk/otel` is the only thing you add. It works with TypeScript (via tsx/ts-node), ESM, CJS, any framework, any LLM SDK. Flusk never touches your code.

## Roadmap

- [x] CLI-first analysis (`npx @flusk/cli analyze`)
- [x] SQLite local storage (zero deps, Node.js 22+ built-in)
- [x] Budget alerts & webhook notifications
- [x] Performance profiling with [@platformatic/flame](https://github.com/platformatic/flame)
- [x] TUI dashboard (7 interactive screens)
- [x] Schema-driven generator framework (90% generated code)
- [x] **Observability integrations** — Grafana, Datadog, New Relic (OTLP export)
- [x] Multi-export (SQLite + external platforms in parallel)
- [ ] VS Code extension
- [ ] GitHub Action for CI cost gates
- [ ] Prompt optimization (semantic dedup)
- [ ] LangChain / LlamaIndex native support
- [ ] Azure OpenAI & Vertex AI providers

---

# For Contributors

## Our Vision: Human Code, Machine YAML

Flusk has a strict philosophy about AI-assisted development:

> **AI contributes to YAML. Humans contribute to code.**

### How it works

90% of the Flusk codebase is **generated from YAML schema files**. Entities, types, repositories, routes, migrations, and tests — all defined in YAML and produced by our generator framework.

```yaml
# packages/schema/entities/budget-alert.yaml — AI can edit this
name: budget-alert
table: budget_alerts
traits: [crud, soft-delete, time-range]
fields:
  - name: agent
    type: string
    required: true
  - name: threshold
    type: number
    required: true
```

```bash
flusk recipe full-entity --from packages/schema/entities/budget-alert.yaml
# → Generates: entity, types, repository, routes, migrations, tests
```

### The rules

| Layer | Who can change it | Process |
|-------|-------------------|---------|
| **YAML schemas** (`packages/schema/entities/*.yaml`) | AI agents + humans | Direct commits, PRs |
| **Generated code** (`@generated` header) | Nobody — run generators | `flusk recipe full-entity` |
| **Custom code** (`// BEGIN CUSTOM` sections) | Humans only | PRs with code review |
| **Core framework** (generators, traits, recipes) | Humans only | PRs with code review |

### Why this matters

- **Code quality stays high** — no AI-generated spaghetti in the codebase
- **Consistency** — every entity follows the exact same patterns
- **Reviewability** — reviewing a YAML diff is 10x faster than reviewing 15 generated files
- **AI-proof** — AI tools evolve fast; our YAML schemas are stable and model-agnostic
- **Contributor-friendly** — new contributors learn one YAML format, not the whole codebase

### For AI coding tools (Copilot, Cursor, Claude, etc.)

If you're using AI to contribute:

1. **Only edit files in `packages/schema/entities/*.yaml`**
2. Run `flusk recipe full-entity` to generate code
3. If you need to change **how** code is generated, that's a **framework PR** — written by a human
4. Never add `@generated` headers manually
5. Never edit files with `@generated` headers directly

See [AI Agent Guide](./docs/generators/for-ai-agents.md) and [YAML Reference](./docs/generators/yaml-guide.md).

## Tech Stack

Built on the [Matteo Collina](https://github.com/mcollina) ecosystem:

- **[Fastify](https://fastify.dev/)** — HTTP server (server mode)
- **[Pino](https://github.com/pinojs/pino)** — Structured logging
- **[Platformatic Watt](https://docs.platformatic.dev/)** — Service orchestration
- **[node:sqlite](https://nodejs.org/api/sqlite.html)** — Zero-dep local storage (Node.js 22+)
- **[OpenTelemetry](https://opentelemetry.io/)** — Non-invasive instrumentation
- **[Ink](https://github.com/vadimdemedes/ink)** — React-based TUI

## Development Setup

```bash
git clone https://github.com/adirbenyossef/flusk-dev.git
cd flusk-dev
pnpm install
pnpm test
pnpm lint
```

### Generator workflow

```bash
# Edit a YAML schema
vim packages/schema/entities/budget-alert.yaml

# Generate all code from it
flusk recipe full-entity --from packages/schema/entities/budget-alert.yaml

# Check generator health
flusk ratio          # Coverage report
flusk guard          # Detect header violations
flusk validate-generated  # Freshness check
```

## Architecture Decisions

| ADR | Decision | Rationale |
|-----|----------|-----------|
| [001](./docs/decisions/001-otel-over-wrappers.md) | OTel over wrappers | Non-invasive, standard, vendor-neutral |
| [002](./docs/decisions/002-node-sqlite-over-deps.md) | node:sqlite over deps | Zero dependencies, Node.js 22+ built-in |

## Docs

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | First run walkthrough |
| [Architecture](./docs/architecture.md) | System design |
| [CLI Reference](./docs/api-reference.md) | All commands & flags |
| [Generator System](./docs/generators/README.md) | YAML → Code pipeline |
| [YAML Guide](./docs/generators/yaml-guide.md) | Schema authoring reference |
| [AI Agent Guide](./docs/generators/for-ai-agents.md) | Rules for AI contributors |
| [Self-Hosting](./docs/self-hosting.md) | Postgres + Redis setup |

---

## Security

Report vulnerabilities to **adir@flusk.app**. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © [Adir Ben Yossef](https://github.com/adirbenyossef) 2026

---

<p align="center">
  <strong>Stop guessing your LLM costs. Start measuring them.</strong>
  <br /><br />
  <code>npx @flusk/cli analyze ./your-app.js</code>
</p>
