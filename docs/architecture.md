# Architecture

## Package Dependency Graph

```
┌──────────────────────────────────────────────┐
│           @flusk/execution                    │
│    (Fastify routes, plugins, hooks)           │
│  Depends on: entities, types, business-logic, │
│              resources, logger                │
└──────┬──────────────┬──────────────┬─────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ @flusk/      │ │ @flusk/      │ │ @flusk/      │
│ business-    │ │ resources    │ │ types        │
│ logic        │ │ (SQLite, pg) │ │              │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       ▼                ▼                ▼
  ┌──────────────────────────────────────────┐
  │            @flusk/entities                │
  └──────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ @flusk/otel  │ │ @flusk/sdk   │ │ @flusk/cli   │
│ (OTel auto-  │ │ (API client) │ │ (Commands +  │
│ instrument)  │ │              │ │  generators) │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Data Flow: Local Mode (default)

```
Your App (unchanged code)
  │  node --import @flusk/otel index.js
  │  → OTel SDK with SqliteSpanExporter
  │  → intercepts OpenAI/Anthropic/Bedrock calls
  ▼
SqliteSpanExporter
  │  Filters GenAI spans
  │  Calculates cost per call
  │  Writes to ~/.flusk/data.db
  ▼
CLI commands (report, history, budget)
  │  Read from SQLite
  ▼
stdout / file output
```

## Data Flow: Server Mode

```
Your App
  │  FLUSK_MODE=server node --import @flusk/otel index.js
  │  → OTel SDK with OTLPTraceExporter
  │  OTLP/HTTP traces
  ▼
Flusk Server (Fastify)
  │  OTLP Ingestion → Pattern Detection
  │  PostgreSQL + Redis
  ▼
API / Dashboard
```

## Storage

### Local (SQLite via node:sqlite)

- Zero dependencies — built into Node.js 22+
- `~/.flusk/data.db` — LLM calls, sessions, patterns
- WAL mode for concurrent reads
- Automatic migrations on first use

### Server (PostgreSQL + Redis)

- pgvector for semantic similarity search
- Redis for caching and job queues
- See [Self-Hosting](./self-hosting.md)

## Mode Detection

The `@flusk/otel` package auto-detects mode:

| Condition | Mode |
|-----------|------|
| `FLUSK_MODE=local` | Local (SQLite) |
| `FLUSK_MODE=server` | Server (HTTP) |
| `FLUSK_ENDPOINT` set | Server (HTTP) |
| No env vars | Local (SQLite) |

## Entities (14)

base, llm-call, pattern, conversion, model-performance, routing-rule,
routing-decision, trace, span, optimization, prompt-template,
prompt-version, profile-session, performance-pattern

## Design Decisions

- **OTel-first** — no wrappers, industry-standard instrumentation
- **SQLite-first** — zero-setup local mode, Postgres as upgrade
- **Pure business logic** — no I/O in business-logic package
- **node:sqlite** — zero deps, built into Node 22+
