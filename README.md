<p align="center">
  <img src="https://raw.githubusercontent.com/adirbenyossef/flusk-dev/main/docs/assets/flusk-logo.png" alt="Flusk" width="200" />
</p>

<h1 align="center">Flusk</h1>

<p align="center">
  <strong>Know exactly what your LLM calls cost. One command, zero setup.</strong>
</p>

<p align="center">
  <a href="https://github.com/adirbenyossef/flusk-dev/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/adirbenyossef/flusk-dev/ci.yml?branch=main&style=for-the-badge" alt="CI"></a>
  <a href="https://github.com/adirbenyossef/flusk-dev/releases"><img src="https://img.shields.io/github/v/release/adirbenyossef/flusk-dev?include_prereleases&style=for-the-badge" alt="Release"></a>
  <a href="https://www.npmjs.com/package/@flusk/cli"><img src="https://img.shields.io/npm/v/@flusk/cli?style=for-the-badge&color=cb3837" alt="npm"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> •
  <a href="#features">Features</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="./docs/getting-started.md">Docs</a> •
  <a href="#contributing">Contributing</a>
</p>

---

## The Problem

You're building with OpenAI, Anthropic, or AWS Bedrock. Costs are invisible until the bill arrives. You don't know which calls are expensive, which prompts are duplicated, or where you're overpaying.

## The Solution

```bash
npx @flusk/cli analyze ./my-app.js
```

Flusk intercepts every LLM call via OpenTelemetry, calculates real costs, detects waste, and tells you exactly how to save money. **All data stays local.** No accounts, no servers, no config files.

## Quick Start

```bash
# Run it. That's it.
npx @flusk/cli analyze ./my-app.js
```

Flusk runs your app for 60 seconds, captures every LLM API call, and prints a cost report with actionable optimization suggestions.

<details>
<summary><strong>Example output</strong></summary>

```
┌─────────────────────────────────────────────────┐
│                 Flusk Cost Report                │
├──────────────┬──────────┬───────────┬────────────┤
│ Model        │ Calls    │ Tokens    │ Cost       │
├──────────────┼──────────┼───────────┼────────────┤
│ gpt-4        │ 47       │ 125,340   │ $3.76      │
│ gpt-4o-mini  │ 112      │ 89,200    │ $0.13      │
│ claude-3.5   │ 23       │ 67,800    │ $0.81      │
├──────────────┼──────────┼───────────┼────────────┤
│ Total        │ 182      │ 282,340   │ $4.70      │
└──────────────┴──────────┴───────────┴────────────┘

⚠ Optimization Suggestions:
  → 12 duplicate prompts detected (saving ~$0.89/day)
  → 31 gpt-4 calls could use gpt-4o-mini (saving ~$2.10/day)
  → Consider caching for repeated classification calls

💰 Estimated monthly savings: $89.70
```

</details>

## Features

🔍 **Cost Breakdown** — Per-model, per-call cost tracking for OpenAI, Anthropic, and AWS Bedrock

🔁 **Duplicate Detection** — Finds repeated prompts and estimates cache savings

💡 **Model Suggestions** — Recommends cheaper models where quality won't suffer

📊 **Budget Alerts** — Set daily/monthly limits, get warnings before you overspend

🔥 **Performance Profiling** — Optional flame graph integration via [@platformatic/flame](https://github.com/platformatic/flame)

🏠 **100% Local** — SQLite storage, no network calls, your data never leaves your machine

🤖 **Multi-Agent Tracking** — Label and compare costs across different AI agents

⚙️ **Zero Config** — Works out of the box. Optional `.flusk.config.js` for power users

## How It Works

```
Your App (unchanged)
    │
    │  node --import @flusk/otel
    ▼
OpenTelemetry Auto-Instrumentation
    │  intercepts OpenAI / Anthropic / Bedrock calls
    ▼
Local SQLite (~/.flusk/data.db)
    │  cost calculation, pattern detection
    ▼
Cost Report + Suggestions (stdout)
```

No wrappers. No monkey-patching. No code changes. Flusk uses [OpenTelemetry](https://opentelemetry.io/) to transparently capture LLM calls at the HTTP layer.

## Commands

```bash
flusk analyze <script>       # Run and analyze LLM costs
flusk report [id]            # View a past analysis report
flusk history                # List all past sessions
flusk budget                 # Check budget status
flusk init                   # Create config file

# Generator system (for contributors)
flusk generate entity --from <yaml>
flusk recipe <name>
flusk regenerate
flusk validate-generated
flusk ratio
```

## Configuration

Optional — Flusk works without any config. For power users:

```javascript
// .flusk.config.js
export const config = {
  budget: {
    daily: 10.00,
    monthly: 200.00,
    perCallThreshold: 0.50,
  },
  alerts: {
    onBudgetExceeded: 'warn',
    webhook: 'https://hooks.slack.com/...',
  },
  agent: 'my-bot',
};
```

## Multi-Agent Tracking

Compare costs across different agents in your system:

```bash
flusk analyze ./bot.js --agent customer-support
flusk analyze ./bot.js --agent content-writer
flusk report --compare customer-support content-writer
```

## Server Mode (Teams)

For persistent monitoring with Postgres + Redis:

```bash
docker compose up -d
export FLUSK_ENDPOINT=http://localhost:3000
node --import @flusk/otel ./index.js
```

See the [Self-Hosting Guide](./docs/self-hosting.md).

## Architecture

Flusk is built on the [Matteo Collina](https://github.com/mcollina) ecosystem:

- **[Fastify](https://fastify.dev/)** — HTTP server (server mode)
- **[Pino](https://github.com/pinojs/pino)** — Logging
- **[Platformatic Watt](https://docs.platformatic.dev/)** — Service orchestration
- **[node:sqlite](https://nodejs.org/api/sqlite.html)** — Zero-dependency local storage (Node.js 22+)
- **[OpenTelemetry](https://opentelemetry.io/)** — Non-invasive instrumentation

## Generator System

Flusk uses a **schema-driven generator framework** where YAML is the single source of truth:

```yaml
# entities/budget-alert.yaml
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
flusk recipe full-entity --from entities/budget-alert.yaml
# → Generates: entity, types, repository, routes, migrations, tests
```

90% of the codebase is generated from YAML schemas. See [Generator Docs](./docs/generators/README.md).

## Roadmap

- [x] CLI-first analysis (`npx @flusk/cli analyze`)
- [x] SQLite local storage (zero deps)
- [x] Budget alerts & webhooks
- [x] Performance profiling with @platformatic/flame
- [x] Schema-driven generator framework
- [ ] VS Code extension
- [ ] GitHub Action for CI cost tracking
- [ ] Dashboard UI
- [ ] Prompt optimization suggestions (semantic dedup)
- [ ] LangChain / LlamaIndex integration

## Examples

```bash
# Basic analysis
npx @flusk/cli analyze ./my-openai-app.js

# With budget limits
npx @flusk/cli analyze ./bot.js --budget-daily 5.00

# Multi-agent comparison
npx @flusk/cli analyze ./support-bot.js --agent support
npx @flusk/cli analyze ./writer-bot.js --agent writer
npx @flusk/cli report --compare support writer
```

See [`examples/`](./examples/) for full working demos.

## Docs

| Guide | Description |
|-------|-------------|
| [Getting Started](./docs/getting-started.md) | First run walkthrough |
| [Architecture](./docs/architecture.md) | System design & decisions |
| [CLI Reference](./docs/api-reference.md) | All commands & flags |
| [Generator System](./docs/generators/README.md) | YAML → Code pipeline |
| [Self-Hosting](./docs/self-hosting.md) | Postgres + Redis setup |
| [ADR 001: OTel over wrappers](./docs/decisions/001-otel-over-wrappers.md) | Why OpenTelemetry |
| [ADR 002: node:sqlite](./docs/decisions/002-node-sqlite-over-deps.md) | Why zero dependencies |

## Contributing

Contributions welcome! Flusk uses a generator-first workflow:

1. Edit YAML schemas in `entities/`
2. Run `flusk recipe full-entity` to generate code
3. Add custom logic only in `// BEGIN CUSTOM` / `// END CUSTOM` sections
4. Run `pnpm test` and `pnpm lint`

See [Generator Guide for Contributors](./docs/generators/for-ai-agents.md).

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
