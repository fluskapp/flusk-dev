<p align="center">
  <h1 align="center">Flusk</h1>
  <p align="center"><strong>Flusk doesn't just show you the problem. It writes the fix.</strong></p>
  <p align="center">
    <a href="#quick-start">Quick Start</a> •
    <a href="#features">Features</a> •
    <a href="#sdk-usage">SDK</a> •
    <a href="#api-reference">API</a> •
    <a href="#self-hosting">Self-Hosting</a>
  </p>
</p>

---

## What is Flusk?

Flusk is an open-source LLM cost optimization platform. It sits between your application and LLM providers, tracking every API call, detecting wasteful patterns (duplicate prompts, overqualified models), and automatically generating code fixes that reduce your bill. Think of it as a profiler for your AI spend — one that writes the optimizations for you.

## Features

- **LLM Call Tracking** — OpenAI + Anthropic interceptors, including streaming support
- **Semantic Similarity Detection** — pgvector-powered duplicate/near-duplicate prompt detection
- **Automatic Model Routing** — route prompts to cheaper models when quality permits
- **Agentic Workflow Tracking** — traces and spans for multi-step LLM workflows
- **Code Generation** — auto-generated optimization code (caching, model swaps, dedup)
- **Prompt Versioning & A/B Testing** — version templates, render with variables, compare performance
- **Real-Time Cost Events** — SSE stream of cost data as calls happen

## Quick Start

```bash
git clone https://github.com/AdirBenYossef/flusk.git
cd flusk
cp .env.example .env          # edit with your API keys (optional)
docker compose up              # PostgreSQL + Redis + Flusk on :3000
```

Health check: [http://localhost:3000/health](http://localhost:3000/health)

## SDK Usage

### Basic Tracking

```typescript
import OpenAI from 'openai';
import { wrapOpenAI, FluskClient } from '@flusk/sdk/node';

const flusk = new FluskClient({
  apiKey: 'your-flusk-api-key',
  baseUrl: 'http://localhost:3000',
});

const openai = wrapOpenAI(new OpenAI(), flusk);

// Use normally — Flusk tracks costs automatically
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }],
});
```

### Model Routing

```typescript
import { route } from '@flusk/sdk/node';

const result = await route(flusk, {
  ruleId: 'my-rule',
  prompt: 'Summarize this article...',
  tokenCount: 500,
  originalModel: 'gpt-4',
});

console.log(result.selectedModel); // e.g. "gpt-4o-mini"
console.log(result.reason);       // "Low complexity, simple summarization"
```

### Workflow Tracing

```typescript
import { startTrace } from '@flusk/sdk/node';

const trace = startTrace(flusk, {
  name: 'research-agent',
  organizationId: 'my-org',
});

const span = trace.startSpan({ name: 'web-search' });
// ... do work ...
span.end();

trace.end();
```

### Prompt Versioning

```typescript
// Create a template via API, then render it:
const rendered = await flusk.renderPrompt('summarize-v2', {
  article: 'The quick brown fox...',
  tone: 'professional',
});
```

## Architecture

```
flusk/
├── packages/
│   ├── entities/         # TypeBox schemas — single source of truth
│   ├── types/            # Derived TS types (Insert, Update, Query)
│   ├── business-logic/   # Pure functions, no I/O, no side effects
│   ├── resources/        # DB repositories, migrations, clients (pg, Redis)
│   ├── execution/        # Fastify app: routes, plugins, hooks
│   ├── sdk/node/         # Client SDK (OpenAI/Anthropic wrappers)
│   └── cli/              # Code generators, validators
├── server.ts             # Entry point
├── docker-compose.yml    # One-command local dev
└── Dockerfile            # Multi-stage production build
```

## API Reference

All routes are prefixed with `/api/v1`.

### LLM Calls
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/llm-calls` | Record an LLM call |
| `GET` | `/llm-calls/:id` | Get call by ID |
| `GET` | `/llm-calls/by-hash/:hash` | Cache lookup by prompt hash |

### Patterns
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/patterns` | List detected patterns |
| `GET` | `/patterns/:id` | Get pattern by ID |
| `POST` | `/patterns` | Create pattern manually |

### Similarity
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/similarity/search` | Find similar prompts (vector search) |

### Model Routing
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/route` | Route a prompt to optimal model |
| `GET` | `/routing-rules` | List routing rules |
| `POST` | `/routing-rules` | Create routing rule |

### Traces & Spans
| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/traces` | Create a trace |
| `GET` | `/traces/:id` | Get trace with spans |
| `POST` | `/spans` | Create a span |

### Optimizations
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/optimizations` | List optimization suggestions |
| `GET` | `/optimizations/:id` | Get optimization with generated code |

### Prompt Templates
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/prompt-templates` | List templates |
| `POST` | `/prompt-templates` | Create template |
| `GET` | `/prompt-versions` | List versions |
| `POST` | `/prompt-versions` | Create version |

### Cost Events
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/events/costs` | SSE stream of real-time cost events |

### GDPR
| Method | Path | Description |
|--------|------|-------------|
| `DELETE` | `/gdpr/user/:orgId` | Delete org data |
| `GET` | `/gdpr/user/:orgId/data` | Export org data |

### Health
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `GET` | `/health/ready` | Readiness check |

## Self-Hosting

### Docker Compose (recommended)

```bash
git clone https://github.com/AdirBenYossef/flusk.git
cd flusk
cp .env.example .env
# Edit .env — at minimum set FLUSK_API_KEY
docker compose up -d
```

### Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://flusk:...@localhost:5432/flusk` | PostgreSQL connection |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection |
| `FLUSK_API_KEY` | `test_org_key` | API authentication key |
| `OPENAI_API_KEY` | — | Required for embeddings/similarity |
| `VECTOR_SIMILARITY_THRESHOLD` | `0.95` | Cosine similarity threshold (0–1) |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | OpenAI embedding model |
| `PORT` | `3000` | Server port |

See [`.env.example`](.env.example) for the full list.

### Seed Demo Data

```bash
./scripts/seed.sh
```

## License

[MIT](LICENSE) © Adir Ben Yossef 2026
