# Getting Started with Flusk

## Prerequisites

- Node.js 22+ (via nvm)
- pnpm
- Docker (for PostgreSQL + Redis)

## Setup

```bash
# 1. Clone and install
git clone git@github.com:adirbenyossef/flusk-dev.git
cd flusk-dev
pnpm install

# 2. Environment
cp .env.example .env
# Edit .env if needed (defaults work for local dev)

# 3. Start infrastructure
pnpm db:up          # Starts PostgreSQL 16 + Redis 7

# 4. Run database migrations
pnpm db:migrate

# 5. Start the server
pnpm dev            # Hot-reload dev server at http://localhost:3000
```

## Verify It Works

```bash
# Health check
curl http://localhost:3000/health

# Create an LLM call
curl -X POST http://localhost:3000/api/v1/llm-calls \
  -H 'Content-Type: application/json' \
  -d '{
    "provider": "openai",
    "model": "gpt-4",
    "prompt": "What is 2+2?",
    "tokens": {"input": 10, "output": 5, "total": 15},
    "response": "4"
  }'
```

## Project Structure

```
server.ts                    → Entry point
packages/
  entities/                  → TypeBox schemas + types
  business-logic/            → Pure functions (cost, hashing, patterns)
  resources/                 → DB repos, Redis cache, migrations
  execution/                 → Fastify app, routes, hooks, middleware
  sdk/node/                  → OpenAI/Anthropic wrapper SDKs
  cli/                       → Code generation CLI
```

## Useful Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (hot reload) |
| `pnpm test` | Run all tests |
| `pnpm db:up` | Start Docker services |
| `pnpm db:down` | Stop Docker services |
| `pnpm db:migrate` | Run SQL migrations |
