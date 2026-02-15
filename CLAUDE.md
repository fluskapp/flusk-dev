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
  schema/         → Entity YAML definitions (source of truth)
  entities/       → TypeBox schemas (generated from schema)
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

## Code Generation Rules

- **NEVER** edit files with `@generated` header directly
- To change an entity: edit `packages/schema/entities/<name>.entity.yaml` then run `flusk regenerate`
- To add a new entity: create YAML in `packages/schema/entities/`, run `flusk recipe full-entity --from <yaml>`
- To add behavior: add capability to YAML, run `flusk regenerate`
- Only `// --- BEGIN CUSTOM ---` sections may be hand-edited
- Run `flusk validate-generated` before committing
- Run `flusk ratio` to check generator coverage (target: 90%)
- See [docs/generators/for-ai-agents.md](docs/generators/for-ai-agents.md) for full details

## Writing Entity YAMLs
- See `docs/generators/yaml-guide.md` for complete reference
- Every field needs: type, description. Add required/index/default as needed.
- Custom queries go in `queries:` block — use `returns: single|list|scalar|raw`
- After creating/editing YAML: `flusk recipe full-entity --from packages/schema/entities/<name>.entity.yaml`

## Important Rules

1. Keep files under 100 lines
2. Business logic must be pure — no DB, no HTTP
3. Entity changes flow from `packages/schema/entities/*.entity.yaml` (source of truth)
4. Use `.js` extensions in imports (ESM)
5. Don't edit `@generated` files — regenerate with CLI
6. Use `@flusk/logger` for all logging
7. 2026 tools only — no deprecated APIs

## AI Sub-Agent Mode (YAML-Only)

For entity work, AI agents operate in **YAML-only mode**:
- Read `docs/generators/agent-instructions.md` for full rules
- Edit ONLY `packages/schema/entities/*.entity.yaml` files
- Run `./scripts/yaml-agent.sh generate <yaml>` to produce code
- NEVER edit `.ts` files directly (except CUSTOM sections)
- Use `./scripts/yaml-agent.sh diff <yaml>` to preview changes

## AI Agent Behavioral Rules

These rules are **non-negotiable** for any AI agent working on this repo:

1. **No shortcuts.** Never fake metrics (e.g., adding `@generated` headers to hand-written files). If the generator can't produce quality code, fix the generator or leave the file as-is.
2. **No unauthorized changes.** Only do what was explicitly asked. If something seems like a good idea but wasn't requested, mention it and ask — don't just do it.
3. **Honesty over numbers.** A real 30% generator ratio is better than a fake 100%. Report the truth.
4. **If you can't do it right, say so.** Don't paper over problems. If a generator produces broken output, report it as a limitation.
5. **Verify your work.** Run `pnpm test` and `pnpm lint` after every change. If tests fail, fix them or revert.
6. **Preserve existing quality.** Never replace working code with worse generated code. The bar is: generated >= hand-written.
7. **Ask before bulk operations.** Changing 100+ files? Describe what you'll do first and get confirmation.

## Protected Files

Some paths are OFF LIMITS for AI modification. See `.flusk/protected.json`.
- `flusk guard` checks for violations
- Pre-commit hook blocks fake @generated headers
- If you need to modify protected files, ask a human first

## QA Validation

Run `scripts/qa-validate.ts` before any PR. It checks:
- Generator integrity, security, code quality, test coverage, protected files
