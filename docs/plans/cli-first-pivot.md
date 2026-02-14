# CLI-First Pivot Plan

## Vision
One command. Instant value. Zero infrastructure.

```bash
npx @flusk/otel analyze ./my-app.js
```

## Why
LLM APIs are expensive and opaque. Developers don't know where their money goes.
Current tools (Helicone, Langfuse) require hosted services or complex setup.
Flusk gives you a cost report in 60 seconds with zero dependencies.

## Who
- Backend engineers using OpenAI/Anthropic/Bedrock in Node.js
- Teams running AI agents in production
- Anyone who got a surprising LLM bill

## Architecture

```
Layer 1: CLI (entry point, zero setup)
  npx @flusk/otel analyze ./app.js
  → runs app with OTel for 60s
  → writes to ~/.flusk/data.db (node:sqlite)
  → prints cost report + suggestions

Layer 2: Config (.flusk.config.ts)
  Budget alerts, webhooks, agent labels
  For production monitoring

Layer 3: Server (optional, existing code)
  flusk server → Postgres + Redis + full dashboard
  For teams that want persistent monitoring
```

## Data Storage

### Local mode (default)
- `node:sqlite` (built into Node 22+, zero deps)
- `~/.flusk/data.db` — LLM calls, costs, patterns
- `~/.flusk/profiles/` — flame pprof + markdown

### Server mode (opt-in)
- Existing Postgres + Redis stack
- `flusk server` command

## Implementation Sprints

### Sprint 1: SQLite Storage Layer (~1 week)
- [ ] Create SQLite adapter in `packages/resources/`
  - `src/sqlite/connection.ts` — node:sqlite singleton
  - `src/sqlite/migrations.ts` — run SQL migrations against SQLite
  - `src/sqlite/repositories/` — same interface as pg repos but SQLite
- [ ] Adapt existing migrations (013, 014) to SQLite-compatible SQL
- [ ] Create `packages/resources/src/storage.ts` — abstract interface
  that both pg and sqlite implement
- [ ] Generator: `g:sqlite-repo` for SQLite repository files

### Sprint 2: CLI Analyze Command (~1 week)
- [ ] `flusk analyze <script>` command
  - Starts target script with `--import @flusk/otel`
  - OTel exports to local SQLite (not HTTP)
  - Runs for configurable duration (default 60s, or until Ctrl-C)
  - On exit: runs pattern detection, generates report
- [ ] Report format (markdown to stdout):
  - Total cost breakdown by model
  - Top 10 most expensive calls
  - Duplicate prompt detection
  - Model optimization suggestions
  - Performance hotspots (if flame is installed)
- [ ] `flusk report` — regenerate report from existing data
- [ ] `flusk history` — show past analyze sessions

### Sprint 3: Config + Budget Alerts (~1 week)
- [ ] `.flusk.config.ts` loader (uses jiti or tsx for TS config)
- [ ] Budget system:
  - Daily/monthly cost limits
  - Per-call cost threshold
  - Duplicate ratio alert
- [ ] Alert channels:
  - stdout (default)
  - Webhook (Slack, Discord)
  - File (append to log)
- [ ] `FLUSK_AGENT=<name>` env var for multi-agent labeling
- [ ] `flusk budget` — show budget status

### Sprint 4: Local OTel Exporter (~1 week)
- [ ] Custom OTel SpanExporter that writes to SQLite
  - Replaces HTTP export to Flusk server
  - Batched writes (configurable flush interval)
  - Zero network overhead
- [ ] Integrate with existing @flusk/otel auto-instrumentation
- [ ] `FLUSK_MODE=local|server` env var
  - `local` (default): SQLite exporter
  - `server`: HTTP exporter to Flusk server

### Sprint 5: Polish + npm Publish (~1 week)
- [ ] `npx @flusk/otel analyze` works out of the box
- [ ] README rewrite for CLI-first
- [ ] Examples updated
- [ ] npm publish `@flusk/otel` and `@flusk/cli`
- [ ] GitHub Actions CI

## Key Decisions
- **node:sqlite over better-sqlite3**: Zero deps, built into Node 22+
- **SQLite-first, Postgres optional**: Lower barrier to entry
- **Same business logic**: Pattern detection, suggestions, flame
  integration all reuse existing code
- **Generator-first**: New patterns get generators before code

## What We Keep
- All business logic (pattern detection, cost calculation, suggestions)
- All entities and type definitions
- OTel auto-instrumentation
- Flame integration
- Generator system
- Server mode (as upgrade path)

## What Changes
- Default storage: Postgres → SQLite
- Default mode: Server → CLI
- Entry point: `docker compose up` → `npx @flusk/otel analyze`
- README focus: Infrastructure → Instant value
