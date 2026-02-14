# AWS Bedrock + Flusk

Zero-touch LLM cost tracking for AWS Bedrock via OpenTelemetry.

## Quick Start (CLI)

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1

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
