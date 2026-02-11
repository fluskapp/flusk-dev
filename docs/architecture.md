# Flusk Architecture

## Package Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│                    @flusk/execution                      │
│            (Fastify routes, plugins, hooks)              │
│     Depends on: entities, types, business-logic,        │
│                 resources                                │
└────────────┬──────────────┬──────────────┬──────────────┘
             │              │              │
             ▼              ▼              ▼
┌────────────────┐ ┌───────────────┐ ┌──────────────────┐
│ @flusk/business │ │  @flusk/      │ │   @flusk/        │
│    -logic       │ │  resources    │ │   types          │
│ (Pure functions)│ │ (DB, Redis,   │ │ (Insert/Update/  │
│ No I/O, no side │ │  OpenAI, etc) │ │  Query schemas)  │
│ effects         │ │               │ │                  │
└───────┬────────┘ └──────┬────────┘ └────────┬─────────┘
        │                 │                    │
        ▼                 ▼                    ▼
   ┌──────────────────────────────────────────────┐
   │              @flusk/entities                   │
   │      (TypeBox schemas — single source of       │
   │       truth for all data shapes)               │
   └────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   @flusk/otel    │  │   @flusk/sdk     │  │   @flusk/cli     │
│ (Zero-touch OTel │  │  (Programmatic   │  │  (Code generator │
│  auto-instrument │  │   API client:    │  │   & validators)  │
│  → OTLP export)  │  │   route, prompts │  │                  │
│                  │  │   optimizations) │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Key principle: Data flows one way

1. **Entities** define shapes (TypeBox schemas)
2. **Types** derive Insert/Update/Query variants
3. **Business logic** validates and transforms (pure functions, no I/O)
4. **Resources** persist and retrieve (PostgreSQL, Redis, OpenAI embeddings)
5. **Execution** composes everything into HTTP endpoints + OTLP ingestion
6. **OTel** provides zero-touch client-side instrumentation
7. **SDK** provides programmatic API access (routing, prompts, optimizations)
8. **CLI** scaffolds new features across all packages

---

## Data Flow: OTel Auto-Instrumentation

```
User's App (unchanged code)
  │
  │  node --require @flusk/otel index.js
  │  ↓ auto-registers OTel SDK + instrumentations
  │
  │  OpenAI/Anthropic calls intercepted by:
  │  • @opentelemetry/instrumentation-openai
  │  • @opentelemetry/instrumentation-undici
  │
  │  OTLP/HTTP traces
  ▼
Flusk Server — POST /v1/traces
  │
  │  Parse OTel spans with GenAI semantic conventions
  │  Extract: model, tokens, cost, latency, content
  │  Map to Flusk LLM call entities
  │
  ▼
Existing Pipeline
  │  hashPrompt → checkCache → calculateCost → store
  │  → schedule embedding → emit cost event
  │  → pattern detection → optimization generation
  ▼
Dashboard / API
```

## Data Flow: Model Routing

```
Client                     Flusk Server                      Database
  │                            │                               │
  │  POST /api/v1/route        │                               │
  ├───────────────────────────>│                               │
  │                     Load routing rule                      │
  │                     classifyComplexity(prompt)              │
  │                     selectModel(complexity, threshold)     │
  │                     Record decision                        │
  │  { selectedModel }        │                               │
  │<───────────────────────────┤                               │
```

## Data Flow: Trace/Span

```
Client SDK                  Flusk Server                   Database
  │ POST /traces → INSERT traces                            │
  │ POST /spans → INSERT spans                              │
  │ POST /spans/:id/complete → UPDATE spans                 │
  │ POST /traces/:id/complete → aggregate stats → UPDATE    │
```

---

## Design Decisions

### OTel-first (not wrapper-based)
Users never modify their LLM SDK code. OpenTelemetry auto-instrumentation captures everything via `node --require @flusk/otel`. This is the industry standard approach.

### OTLP ingestion at /v1/traces
The server accepts standard OTLP trace format, parses GenAI semantic conventions, and maps spans to Flusk's existing LLM call entities. This bridges OTel data into the existing pipeline.

### TypeBox for schemas (not Zod)
TypeBox generates JSON Schema at compile time, integrating natively with Fastify.

### Pure business logic (no I/O)
All functions in `@flusk/business-logic` are pure — no DB, no HTTP, no side effects.

### pgvector for similarity search
PostgreSQL's pgvector extension for embeddings — one database, simpler deployment.

### SSE for real-time cost events
Simpler than WebSocket, works through HTTP/2 and CDNs, unidirectional.
