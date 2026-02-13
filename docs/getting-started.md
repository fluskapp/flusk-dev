# Getting Started with Flusk

Flusk tracks LLM API calls via OpenTelemetry auto-instrumentation —
zero code changes — detects patterns, and suggests optimizations.

## Prerequisites

- **Node.js** ≥ 22
- **pnpm** ≥ 10
- **PostgreSQL** 16+ with pgvector
- **Redis** 7+

## 1. Install @flusk/otel

```bash
npm install @flusk/otel
```

## 2. Add the --import flag

```json
{
  "scripts": {
    "start": "node --import @flusk/otel ./index.js"
  }
}
```

## 3. Set environment variables

```bash
FLUSK_API_KEY=your-flusk-api-key
FLUSK_ENDPOINT=http://localhost:3000
FLUSK_PROJECT_NAME=my-app
FLUSK_CAPTURE_CONTENT=true
FLUSK_LOG_LEVEL=info
```

## 4. Use your LLM client normally

```typescript
import OpenAI from 'openai';

const openai = new OpenAI();
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello!' }],
});
// Flusk captures this automatically via OTel
```

Works with Anthropic and Bedrock too — no wrappers needed.

## 5. View tracked calls

```bash
curl http://localhost:3000/api/v1/patterns?organizationId=<org-id>
curl http://localhost:3000/api/v1/llm-calls/<id>
```

## 6. Performance Profiling

Install `@platformatic/flame` for CPU profiling:

```bash
npm install @platformatic/flame
```

Set `FLUSK_PROFILE_MODE=auto` (default) to enable. Profiles are
generated automatically during LLM calls.

```bash
flusk profile run ./dist/index.js --duration 60
flusk profile analyze ./profiles/cpu.md
```

## 7. Logger Configuration

Flusk uses `@flusk/logger` (Pino-based) internally. Configure via:

- `FLUSK_LOG_LEVEL` — `fatal|error|warn|info|debug|trace`
- `NODE_ENV` — non-production enables pretty printing

## Next Steps

- [SDK Reference](./sdk-reference.md)
- [Architecture](./architecture.md)
- [API Reference](./api-reference.md)
- [Self-Hosting](./self-hosting.md)
