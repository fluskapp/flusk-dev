# Getting Started

## Prerequisites

- **Node.js** ≥ 22

That's it. No databases, no Docker, no API keys.

## 1. Analyze your app

```bash
npx @flusk/cli analyze ./my-app.js
```

Flusk instruments your app via OpenTelemetry, captures every LLM call
for 60 seconds, and prints a cost report. All data stored locally in SQLite.

## 2. See the cost report

The report shows:
- **Cost breakdown** by model (OpenAI, Anthropic, Bedrock)
- **Duplicate prompts** with savings estimates
- **Model swap suggestions** (e.g., gpt-4 → gpt-4o-mini)
- **Per-call costs** that exceed thresholds

```
🔍 Analyzing ./my-app.js...
   Local mode — direct SQLite export
   Duration: 60s

📊 Cost Report — session abc123
   Total cost: $1.42 (23 calls)
   By model:
     gpt-4o          $0.89  (15 calls)
     claude-3-haiku   $0.53  (8 calls)
   Duplicates: 4 calls ($0.31 wasted)
   Suggestions:
     → 3 gpt-4o calls could use gpt-4o-mini (est. savings: $0.12)
```

## 3. Add budget alerts

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
};
```

Or run `flusk init` to generate one interactively.

Then check budget status anytime:

```bash
flusk budget
```

## Customize duration

```bash
flusk analyze ./my-app.js --duration 120    # 2 minutes
flusk analyze ./my-app.js --duration 0      # run until Ctrl-C
```

## Save reports

```bash
flusk analyze ./my-app.js --output report.md
flusk analyze ./my-app.js --output report.json --format json
```

## View history

```bash
flusk history          # list past sessions
flusk report <id>      # regenerate a report
```

## Multi-agent labeling

```bash
flusk analyze ./bot.js --agent support-bot
FLUSK_AGENT=writer-bot node --import @flusk/otel ./writer.js
```

## Performance profiling (optional)

Install `@platformatic/flame` for CPU profiling:

```bash
npm install @platformatic/flame
flusk analyze ./my-app.js   # auto-detects flame
```

## Storage

By default, Flusk uses **SQLite** (`~/.flusk/data.db`) — zero dependencies,
built into Node.js 22+. No setup required.

For teams that need persistent monitoring, upgrade to **Postgres + Redis**
via [Self-Hosting](./self-hosting.md).

## Next steps

- [Architecture](./architecture.md) — how it works under the hood
- [CLI Reference](./api-reference.md) — all commands and options
- [Generator System](./generators/README.md) — schema-first code generation
- [Self-Hosting](./self-hosting.md) — upgrade to server mode
