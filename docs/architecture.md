# Architecture

## Overview

Flusk is a **CLI-first** LLM cost optimization platform. The default experience requires zero infrastructure — just run `flusk analyze` and get a cost report backed by local SQLite.

## Package Dependency Graph

```
                    ┌──────────────┐
                    │  @flusk/cli   │  ← CLI-first entry point
                    │  (commands,   │     flusk analyze, recipe,
                    │   generators, │     regenerate, guard, etc.
                    │   recipes)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  @flusk/     │
                    │  execution   │  ← Fastify routes (server mode)
                    └──┬───┬───┬──┘
                       │   │   │
          ┌────────────┘   │   └────────────┐
          ▼                ▼                ▼
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │ @flusk/      │ │ @flusk/      │ │ @flusk/      │
   │ business-    │ │ resources    │ │ types        │
   │ logic        │ │ (SQLite, pg) │ │              │
   └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                    ┌──────────────┐
                    │  @flusk/     │
                    │  entities    │  ← Generated TypeBox schemas
                    └──────────────┘

   ┌──────────────┐ ┌──────────────┐
   │ @flusk/otel  │ │ @flusk/sdk   │  ← Instrumentation & API client
   └──────────────┘ └──────────────┘
```

**Dependency flow:** entities → types → resources → business-logic → execution → cli

## CLI-First Entry Point

The CLI (`@flusk/cli`) is the primary interface. All workflows start here:

| Command | Purpose |
|---------|---------|
| `flusk analyze` | Instrument and analyze LLM costs |
| `flusk report` | View/regenerate reports |
| `flusk budget` | Check budget status |
| `flusk recipe` | Run code generation recipes |
| `flusk regenerate` | Incremental code regeneration |
| `flusk guard` | CI: detect header violations |
| `flusk validate-generated` | CI: check staleness |
| `flusk ratio` | CI: generator coverage |
| `flusk status` | Overview of generated file health |

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

## Data Flow: Server Mode (optional upgrade)

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

### SQLite (default — zero setup)

- Uses `node:sqlite` — built into Node.js 22+, zero external dependencies
- `~/.flusk/data.db` — LLM calls, sessions, patterns
- WAL mode for concurrent reads
- Automatic migrations on first use

### PostgreSQL + Redis (upgrade path)

- pgvector for semantic similarity search
- Redis for caching and job queues
- See [Self-Hosting](./self-hosting.md)

### Mode Detection

| Condition | Mode |
|-----------|------|
| `FLUSK_MODE=local` | Local (SQLite) |
| `FLUSK_MODE=server` | Server (HTTP) |
| `FLUSK_ENDPOINT` set | Server (HTTP) |
| No env vars | Local (SQLite) |

## Generator System

The generator is the architecture backbone — schema-first code generation from YAML.

```
Entity YAML (.entity.yaml)
  │  flusk recipe full-entity --from <yaml>
  ▼
Schema Parser → Validator → Recipe Runner
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              Types/Entity  Migration  Traits Composer
                                         │
                                    ┌────┼────┐
                                    ▼    ▼    ▼
                                  Repo  Routes Barrels
```

### Phases

| Phase | Feature | Description |
|-------|---------|-------------|
| 1 — Schema | YAML → parsed `EntitySchema` | Parse, validate, type-check entity definitions |
| 2 — Traits | Composable code mixins | crud, time-range, aggregation, soft-delete, export |
| 3 — Recipes | One command → 8+ files | `full-entity`, `fastify-plugin`, `cli-command`, etc. |
| 4 — Regeneration | Safe incremental updates | Smart merge preserving CUSTOM regions, stale detection |
| 5 — CI Enforcement | Validate + ratio tracking | `guard`, `validate-generated`, `ratio` commands |

See [Generator System docs](./generators/README.md) for details.

## Entities (15)

llm-call, analyze-session, trace, span, pattern, performance-pattern,
conversion, model-performance, routing-rule, routing-decision,
optimization, prompt-template, prompt-version, profile-session, budget-alert

## Design Decisions

- **OTel-first** — no wrappers, industry-standard instrumentation ([ADR-001](./decisions/001-otel-over-wrappers.md))
- **SQLite-first** — zero-setup local mode, Postgres as upgrade path ([ADR-002](./decisions/002-node-sqlite-over-deps.md))
- **Pure business logic** — no I/O in the business-logic package
- **node:sqlite** — zero deps, built into Node 22+
- **CLI-first** — no server required for the core workflow
