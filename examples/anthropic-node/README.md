# Anthropic + Flusk

Zero-touch LLM cost tracking for Anthropic via OpenTelemetry.

## Quick Start (CLI)

```bash
# Set your API key
export ANTHROPIC_API_KEY=sk-ant-...

# Analyze (one command, no server needed)
npx @flusk/cli analyze ./index.js

# Or with options
flusk analyze ./index.js --duration 120 --agent my-bot
```

## Manual Setup

Add `@flusk/otel` to your existing workflow:

```bash
npm install @flusk/otel
node --import @flusk/otel ./index.js
```

No wrappers. No code changes. Just `--import @flusk/otel`.
