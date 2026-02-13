# Flusk Architecture

## Package Dependency Graph

```
┌─────────────────────────────────────────────────┐
│              @flusk/execution                    │
│       (Fastify routes, plugins, hooks)           │
│  Depends on: entities, types, business-logic,    │
│              resources, logger                   │
└──────┬──────────────┬──────────────┬────────────┘
       │              │              │
       ▼              ▼              ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ @flusk/      │ │ @flusk/      │ │ @flusk/      │
│ business-    │ │ resources    │ │ types        │
│ logic        │ │ (DB, Redis)  │ │ (Insert/     │
│ (Pure, no IO)│ │              │ │  Update/Query│
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       ▼                ▼                ▼
  ┌──────────────────────────────────────────┐
  │            @flusk/entities                │
  │   (TypeBox schemas — source of truth)    │
  └──────────────────────────────────────────┘

┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ @flusk/otel  │ │ @flusk/sdk   │ │ @flusk/cli   │
│ (OTel auto-  │ │ (API client) │ │ (Generators) │
│ instrument)  │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘

┌──────────────┐
│ @flusk/logger│
│ (Pino-based) │
└──────────────┘
```

## Entities (14)

base, llm-call, pattern, conversion, model-performance, routing-rule,
routing-decision, trace, span, optimization, prompt-template,
prompt-version, profile-session, performance-pattern

## Data Flow: OTel Auto-Instrumentation

```
User's App (unchanged code)
  │  node --import @flusk/otel index.js
  │  → auto-registers OTel SDK + instrumentations
  │  → intercepts OpenAI/Anthropic/Bedrock calls
  │  OTLP/HTTP traces
  ▼
Flusk Server — POST /v1/traces
  │  Parse spans with GenAI semantic conventions
  │  Extract: model, tokens, cost, latency, content
  ▼
Pipeline: hash → cache check → cost calc → store
  → embedding → pattern detection → optimization
```

## Generator System

The CLI scaffolds code across all packages from entity schemas.
28+ generators: feature, entity-schema, types, resources,
business-logic, execution, fastify-plugin, otel-hook, detector,
profile, provider, route, plugin, middleware, and more.

```bash
pnpm tsx packages/cli/bin/flusk.ts g feature <name>
```

## Design Decisions

- **OTel-first** — no wrappers, industry-standard instrumentation
- **TypeBox** — JSON Schema at compile time, native Fastify integration
- **Pure business logic** — no I/O in business-logic package
- **pgvector** — semantic similarity in PostgreSQL, simpler deployment
- **SSE** — real-time cost events, simpler than WebSocket
- **Pino logging** — structured JSON logs via @flusk/logger
