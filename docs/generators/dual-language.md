# Dual-Language Architecture

Flusk generates both **TypeScript** (Node.js) and **Python** code from the same YAML entity schemas. This document explains how it works.

## The Big Picture

```
packages/schema/entities/*.entity.yaml   (source of truth)
         │
         ├── flusk recipe full-entity ──→ TypeScript packages (10 npm)
         │     entities/, types/, resources/, business-logic/,
         │     execution/, sdk/, cli/, otel/, logger/
         │
         └── flusk recipe python-package ──→ Python package (1 PyPI)
               flusk-py/src/flusk/
               types/, repositories/, cli/, otel/
```

One YAML file. Two languages. Same behavior.

## What's Shared

- **Entity definitions** — field names, types, constraints, relationships
- **SQLite schema** — identical table structures, migrations, indexes
- **CLI UX** — same commands (`analyze`, `report`, `history`), same flags
- **OTel instrumentation** — same span attributes, same semantic conventions
- **Cost models** — same pricing data, same calculation logic

## What's Different

- **TypeScript** uses TypeBox schemas, Fastify routes, Pino logging
- **Python** uses Pydantic models, Click CLI, Rich output
- **TypeScript** has server mode (Postgres + Redis) — Python is CLI-only for now
- **TypeScript** has the TUI dashboard — Python uses Rich tables

## Cross-Language Compatibility

The SQLite database at `~/.flusk/data.db` uses the same schema in both languages. You can:

```bash
# Analyze a Node.js app
npx @flusk/cli analyze ./server.js

# View the same session from Python
flusk history
flusk report <session-id>
```

This works because both generators produce repositories that read/write the same tables with the same column names and types.

## Adding a New Entity (Both Languages)

1. Create the YAML schema:

```bash
vim packages/schema/entities/my-entity.entity.yaml
```

2. Generate TypeScript:

```bash
flusk recipe full-entity --from packages/schema/entities/my-entity.entity.yaml
```

3. Regenerate Python:

```bash
flusk recipe python-package
```

4. Verify both:

```bash
pnpm test && pnpm build
cd flusk-py && pytest
```

## Adding a New Provider (Both Languages)

Providers are defined in YAML too. Adding a provider to the schema automatically generates interceptors for both TypeScript and Python.

```bash
# After editing the provider YAML
flusk recipe full-entity --from packages/schema/entities/my-provider.entity.yaml
flusk recipe python-package
```

## The `python-package` Recipe

`flusk recipe python-package` reads every `.entity.yaml` file and generates:

- `flusk-py/src/flusk/types/<entity>_types.py` — Pydantic models
- `flusk-py/src/flusk/repositories/<entity>_repository.py` — SQLite CRUD
- `flusk-py/src/flusk/cli/` — Click commands
- `flusk-py/src/flusk/otel/` — Instrumentation hooks
- `flusk-py/pyproject.toml` — Package metadata (updated)

All generated files have `# --- BEGIN GENERATED ---` markers. The recipe overwrites everything between these markers.

## Why Dual-Language?

- **Reach** — Node.js and Python are the two dominant languages for AI/LLM apps
- **Consistency** — one schema, no drift between implementations
- **Maintainability** — fix a bug in YAML, regenerate both languages
- **Correctness** — the SQLite schema is always in sync
