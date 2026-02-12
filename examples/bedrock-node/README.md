# AWS Bedrock + Flusk

Zero-touch LLM cost tracking for AWS Bedrock via OpenTelemetry.

## Setup

```bash
# 1. Start Flusk
cd ../.. && docker compose up -d

# 2. Install deps
pnpm install

# 3. Set env vars (AWS credentials + Flusk)
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_REGION=us-east-1
export FLUSK_ENDPOINT=http://localhost:3000

# 4. Run
pnpm start
```

No wrappers. No code changes. Just `--import @flusk/otel`.
