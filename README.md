# Flusk

Track and optimize your LLM API costs. One command, zero setup.

## Quick Start

```bash
npx @flusk/cli analyze ./my-app.js
```

Flusk runs your app for 60 seconds, tracks every LLM call, and prints
a cost report with optimization suggestions. No server, no accounts,
no configuration.

## What you get

- Cost breakdown by model (OpenAI, Anthropic, Bedrock)
- Duplicate prompt detection with savings estimates
- Model optimization suggestions (e.g., gpt-4 → gpt-4o-mini)
- Budget tracking and alerts
- Performance profiling (optional, with @platformatic/flame)

## Install

```bash
npm install -g @flusk/cli
```

Or use directly with npx — no install needed.

## Commands

| Command | Description |
|---------|-------------|
| `flusk analyze <script>` | Run script and analyze LLM costs |
| `flusk report [id]` | View or regenerate an analysis report |
| `flusk history` | List past analysis sessions |
| `flusk budget` | Check budget status |
| `flusk init` | Create `.flusk.config.js` |

## How it works

```
Your App (unchanged)
  │ node --import @flusk/otel
  ▼
OTel auto-instrumentation
  │ intercepts OpenAI/Anthropic/Bedrock calls
  ▼
SQLite (~/.flusk/data.db)
  │ cost calculation, pattern detection
  ▼
Report (stdout or file)
```

All data stays local. No network calls unless you opt into server mode.

## Configuration

Create `.flusk.config.js` in your project root:

```javascript
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

## Multi-agent tracking

Label different agents in your system:

```bash
flusk analyze ./bot.js --agent customer-support
flusk analyze ./bot.js --agent content-writer
```

## Server mode (optional)

For teams that want persistent monitoring with Postgres + Redis:

```bash
docker compose up -d
export FLUSK_ENDPOINT=http://localhost:3000
node --import @flusk/otel ./index.js
```

See [Self-Hosting Guide](./docs/self-hosting.md).

## Examples

- [`examples/openai-node/`](./examples/openai-node/)
- [`examples/anthropic-node/`](./examples/anthropic-node/)
- [`examples/bedrock-node/`](./examples/bedrock-node/)

## Docs

- [Getting Started](./docs/getting-started.md)
- [Architecture](./docs/architecture.md)
- [CLI Reference](./docs/api-reference.md)
- [Self-Hosting](./docs/self-hosting.md)

## License

[MIT](LICENSE) © Adir Ben Yossef 2026
