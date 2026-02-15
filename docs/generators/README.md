# Flusk Generator System

## Philosophy: Schema-First Code Generation

The generator is not a tool — it **is** the architecture.

When the schema is the source of truth, code is just a projection of it. Change the schema → everything updates automatically across all layers.

### Why Schema-First?

1. **Single Source of Truth**: One YAML file defines an entity. TypeBox schemas, SQLite migrations, types — all derived from it.
2. **Consistency by Construction**: Generated code follows the same patterns every time. No copy-paste drift.
3. **AI-Friendly**: AI agents don't write boilerplate — they write schemas and business logic. Everything else is generated.
4. **Auditable**: Every generated file traces back to a YAML definition. You can verify the entire codebase matches its schemas.

### What Gets Generated

From a single `packages/schema/entities/foo.entity.yaml`:

| Output | Package | Description |
|--------|---------|-------------|
| `foo.entity.ts` | `@flusk/entities` | TypeBox schema with full type definitions |
| `foo.types.ts` | `@flusk/types` | Insert/Update/Query variants |
| `foo.sql` | `@flusk/resources` | SQLite CREATE TABLE + indexes |

With `full-entity` recipe, also:

| Output | Package | Description |
|--------|---------|-------------|
| Repository | `@flusk/resources` | CRUD + custom queries |
| Routes | `@flusk/execution` | Fastify route handlers |
| Barrel exports | Various | Updated `index.ts` files |

### Usage

```bash
# Generate from a single YAML (entity + types + migration)
flusk generate entity --from packages/schema/entities/llm-call.entity.yaml

# Full recipe — generates 8+ files
flusk recipe full-entity --from packages/schema/entities/llm-call.entity.yaml

# List all recipes
flusk recipe list

# Regenerate stale files after YAML edit
flusk regenerate

# Dry-run to preview changes
flusk regenerate --dry-run
```

### What Stays Manual

- **Business logic** — that's where the real value is
- **Custom queries** — beyond CRUD, your domain logic
- **Route handlers** — generated stubs, but logic is yours
- **Custom code in CUSTOM regions** — preserved across regeneration

## Phases

| Phase | Feature | Docs |
|-------|---------|------|
| 1 | Schema system — YAML → typed entities | [schema-format.md](./schema-format.md) |
| 2 | Trait system — composable code mixins | [traits.md](./traits.md) |
| 3 | Recipe system — one command → 8+ files | [recipes.md](./recipes.md) |
| 4 | Regeneration — safe incremental updates | [regeneration.md](./regeneration.md) |
| 5 | CI enforcement — validate + ratio tracking | [ci-enforcement.md](./ci-enforcement.md) |

## CI Commands

| Command | Purpose |
|---------|---------|
| `flusk validate-generated --strict` | Fail if generated files are stale or tampered |
| `flusk guard` | Fail if `@generated` headers on non-generated files |
| `flusk ratio --json` | Report generated vs manual code ratio |
| `flusk status` | Overview of generated file health |

## Architecture Deep Dive

See [Generator Architecture](./architecture.md) for the internal
design of the schema parser, trait composer, and recipe runner.

## YAML Guide

See [YAML Guide](./yaml-guide.md) for the complete entity YAML format
with all field types, capabilities, and query syntax.

## For AI Agents

See [for-ai-agents.md](./for-ai-agents.md) — specific instructions
for Claude, Copilot, and Cursor on working with this system.

## Agent Instructions

See [agent-instructions.md](./agent-instructions.md) — rules for AI agents
generating and modifying code in this project.
