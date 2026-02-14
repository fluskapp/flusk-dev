# CLAUDE.md — Flusk AI Agent Guide

## What is Flusk?

LLM cost optimization platform. One command, zero setup:

```bash
npx @flusk/cli analyze ./my-app.js
```

Tracks LLM API calls via OTel, detects patterns (duplicate/similar
prompts, overqualified models), suggests cost-saving conversions,
and generates performance profiles.

## Architecture (Monorepo)

```
packages/
  entities/       → TypeBox schemas (source of truth)
  types/          → Derived TS types (Insert, Update, Query)
  business-logic/ → Pure functions, NO I/O
  resources/      → SQLite + Postgres repos, clients, migrations
  execution/      → Fastify app: routes, plugins, hooks
  sdk/            → Client wrappers (OpenAI, Anthropic interceptors)
  cli/            → CLI commands + code generators
  otel/           → Zero-touch OTel auto-instrumentation
  logger/         → Structured logging (Pino)
```

## CLI Commands

```bash
flusk analyze <script>    # Run and analyze LLM costs
  -d, --duration <s>      # Duration (default: 60, 0 = until exit)
  -o, --output <file>     # Write report to file
  -f, --format <fmt>      # markdown or json
  -a, --agent <name>      # Multi-agent label
  -m, --mode <mode>       # local (default) or server

flusk report [id]         # View/regenerate analysis report
flusk history             # List past sessions
flusk budget              # Check budget status
flusk init                # Create .flusk.config.js
```

## Storage Modes

### Local (default)
- `node:sqlite` — zero deps, built into Node 22+
- `~/.flusk/data.db` — all data
- `SqliteSpanExporter` writes GenAI spans directly to SQLite
- `FLUSK_MODE=local` (or no env vars)

### Server (opt-in)
- PostgreSQL + Redis + pgvector
- `OTLPTraceExporter` sends spans over HTTP
- `FLUSK_MODE=server` or `FLUSK_ENDPOINT` set

## Config System

`.flusk.config.js` in project root:
- Budget limits (daily, monthly, per-call, duplicate ratio)
- Alert channels (stdout, webhook)
- Agent labels (`FLUSK_AGENT` env var)

## Entities (14 total)

base, llm-call, pattern, conversion, model-performance, routing-rule,
routing-decision, trace, span, optimization, prompt-template,
prompt-version, profile-session, performance-pattern

## File Conventions

- **Max 100 lines per file**
- **Naming:** `kebab-case.suffix.ts`
- **Suffixes:** `.entity.ts`, `.types.ts`, `.function.ts`,
  `.repository.ts`, `.routes.ts`, `.plugin.ts`, `.hooks.ts`,
  `.middleware.ts`, `.client.ts`, `.test.ts`
- **Barrel exports:** Every package has `src/index.ts`
- **Imports:** `@flusk/entities`, `@flusk/types`, `@flusk/resources`,
  `@flusk/business-logic`, `@flusk/logger`
- **Logging:** Use `@flusk/logger`, not `console.log`
- **No default exports** — named exports only

## Adding Features

### Always use the generator

```bash
pnpm tsx packages/cli/bin/flusk.ts g feature <name>
```

### Available Generators

entity-schema, types, resources, business-logic, execution, feature,
feature-test, route, plugin, middleware, service, fastify-plugin,
otel-hook, detector, profile, provider, package, infrastructure,
docker-compose, dockerfile, entrypoint, env, swagger, watt, test,
barrel-updater

## Commands

```bash
pnpm test       # All tests (vitest)
pnpm dev        # Dev server with hot reload
pnpm build      # Build all packages
pnpm db:migrate # Run migrations
pnpm lint       # ESLint
```

## Important Rules

1. Keep files under 100 lines
2. Business logic must be pure — no DB, no HTTP
3. Entity changes flow from `packages/entities/`
4. Use `.js` extensions in imports (ESM)
5. Don't edit `@generated` files — regenerate with CLI
6. Use `@flusk/logger` for all logging
7. 2026 tools only — no deprecated APIs
