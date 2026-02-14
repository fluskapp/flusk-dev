# Getting Started

## Prerequisites

- **Node.js** ≥ 22

That's it. No databases, no Docker, no API keys.

## 1. Analyze your app

```bash
npx @flusk/cli analyze ./my-app.js
```

Flusk instruments your app via OpenTelemetry, captures every LLM call
for 60 seconds, and prints a cost report.

## 2. Customize duration

```bash
flusk analyze ./my-app.js --duration 120    # 2 minutes
flusk analyze ./my-app.js --duration 0      # run until Ctrl-C
```

## 3. Save reports

```bash
flusk analyze ./my-app.js --output report.md
flusk analyze ./my-app.js --output report.json --format json
```

## 4. View history

```bash
flusk history          # list past sessions
flusk report <id>      # regenerate a report
```

## 5. Add a config file

```bash
flusk init             # creates .flusk.config.js
```

Configure budgets, alerts, webhooks, and agent labels.
See the [README](../README.md) for config examples.

## 6. Multi-agent labeling

```bash
flusk analyze ./bot.js --agent support-bot
FLUSK_AGENT=writer-bot node --import @flusk/otel ./writer.js
```

## 7. Performance profiling (optional)

Install `@platformatic/flame` for CPU profiling:

```bash
npm install @platformatic/flame
flusk analyze ./my-app.js   # auto-detects flame
```

## Next steps

- [Architecture](./architecture.md) — how it works
- [CLI Reference](./api-reference.md) — all commands
- [Self-Hosting](./self-hosting.md) — upgrade to server mode
