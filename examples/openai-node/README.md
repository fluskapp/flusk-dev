# OpenAI + Flusk

Zero-touch LLM cost tracking for OpenAI via OpenTelemetry.

## Setup

```bash
# 1. Start Flusk
cd ../.. && docker compose up -d

# 2. Install deps
pnpm install

# 3. Set env vars
export OPENAI_API_KEY=sk-...
export FLUSK_ENDPOINT=http://localhost:3000

# 4. Run
pnpm start
```

No wrappers. No code changes. Just `--import @flusk/otel`.
