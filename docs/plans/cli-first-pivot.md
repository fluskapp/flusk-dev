# CLI-First Pivot Plan

## Vision
One command. Instant value. Zero infrastructure.

```bash
npx @flusk/cli analyze ./my-app.js
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
  npx @flusk/cli analyze ./app.js
  → runs app with OTel for 60s
  → writes to ~/.flusk/data.db (node:sqlite)
  → prints cost report + suggestions

Layer 2: Config (.flusk.config.js)
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

### Sprint 1: SQLite Storage Layer ✅
- [x] Create SQLite adapter in `packages/resources/`
  - `src/sqlite/connection.ts` — node:sqlite singleton
  - `src/sqlite/migrations.ts` — run SQL migrations against SQLite
  - `src/sqlite/repositories/` — same interface as pg repos but SQLite
- [x] Adapt existing migrations to SQLite-compatible SQL
- [x] Create `packages/resources/src/storage.ts` — abstract interface
  that both pg and sqlite implement
- [x] Generator: `g:sqlite-repo` for SQLite repository files

### Sprint 2: CLI Analyze Command ✅
- [x] `flusk analyze <script>` command
  - Starts target script with `--import @flusk/otel`
  - OTel exports to local ephemeral receiver
  - Runs for configurable duration (default 60s, or until Ctrl-C)
  - On exit: runs pattern detection, generates report
- [x] Report format (markdown to stdout)
- [x] `flusk report` — regenerate report from existing data
- [x] `flusk history` — show past analyze sessions

### Sprint 3: Config + Budget Alerts ✅
- [x] `.flusk.config.js` loader
- [x] Budget system (daily/monthly limits, per-call threshold, duplicate ratio)
- [x] Alert channels (stdout, webhook)
- [x] `FLUSK_AGENT=<name>` env var for multi-agent labeling
- [x] `flusk budget` — show budget status

### Sprint 4: Local OTel Exporter ✅
- [x] Custom `SqliteSpanExporter` writes GenAI spans directly to SQLite
- [x] `resolveExporter` auto-detects local vs server mode
- [x] `FLUSK_MODE=local|server` env var (default: local)
- [x] Analyze command uses direct SQLite export in local mode
- [x] HTTP receiver kept as fallback for server mode
- [x] Tests for exporter and mode detection

### Sprint 5: Polish + Docs ✅
- [x] README rewrite for CLI-first experience
- [x] docs/getting-started.md rewritten around `flusk analyze`
- [x] docs/architecture.md updated with SQLite layer
- [x] docs/api-reference.md updated with CLI commands
- [x] docs/self-hosting.md positioned as upgrade path
- [x] Examples updated (openai, anthropic, bedrock)
- [x] GitHub Actions CI workflow
- [x] CLAUDE.md updated

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
- Entry point: `docker compose up` → `npx @flusk/cli analyze`
- README focus: Infrastructure → Instant value
