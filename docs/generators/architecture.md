# Generator Architecture

## Why This Architecture?

Traditional generators are template-per-file: each generator produces one file in a fixed format. This covers ~30% of code. To reach 90%, we need composition.

The schema system is the foundation. Everything flows from YAML → typed schema → generated code.

## Pipeline Flow

```
YAML File
    │
    ▼
┌─────────────────┐
│  YAML Parser    │  parse-yaml-file.ts
│  (syntax check) │  Catches malformed YAML
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Shape Validator │  shape-validator.ts
│  (structure)     │  Checks required keys, valid types
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Semantic Rules  │  semantic-rules.ts
│  (logic)         │  Reserved words, enum values, constraints
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  EntitySchema    │  Fully typed, validated
│  (in memory)     │  Ready for code generation
└────────┬────────┘
         │
    ┌────┼────┬──────────┬──────────────┐
    ▼    ▼    ▼          ▼              ▼
  TypeBox  Types  Migration    Trait Composer
                               (repo, routes, trait SQL)
```

## Key Components

### Parser (`entity-schema.parser.ts`)
- Entry point: `parseEntitySchema(filePath)`
- Combines YAML parsing + shape validation
- Returns typed `EntitySchema` or throws with clear errors
- Logged via `@flusk/logger` at every step

### Validator (`entity-schema.validator.ts`)
- Single entity: `validateEntitySchema(schema)`
- Multi-entity: `validateEntitySchemas(schemas[])` — adds cross-entity checks
- Delegates to shape-validator, semantic-rules, dependency-graph

### Registry (`entity-schema.registry.ts`)
- Loads all `.entity.yaml` files from `packages/schema/entities/` directory
- Validates all schemas together
- Builds dependency-ordered list (topological sort)
- Writes `_registry.yaml` for human reference

### Generators
- `generate-typebox.ts` → `@flusk/entities` TypeBox schema
- `generate-types-file.ts` → `@flusk/types` variants (Insert/Update/Query)
- `generate-migration.ts` → SQLite CREATE TABLE SQL
- `generate-entity-pipeline.ts` → Orchestrates all generators

## Design Decisions

### Why separate shape and semantic validation?
Shape errors (missing `name`, wrong `type`) are structural — they mean the YAML is malformed. Semantic errors (reserved words, circular deps) mean the YAML is valid but the definition has logical issues. Separating them gives clearer error messages.

### Why topological sort?
SQLite enforces FK constraints. If `PerformancePattern` references `ProfileSession`, the `profile_sessions` table must exist first. Topological sort ensures migrations run in the right order.

### Why a registry?
Generators need to resolve cross-entity references. The registry provides a single lookup point. `_registry.yaml` makes the entity catalog human-visible.

### Why synchronous file I/O in generators?
Generation is a CLI tool, not a server. Synchronous I/O is simpler, easier to debug, and avoids race conditions when writing multiple files. The entire pipeline runs in <100ms.

## Trait Layer (Phase 2)

The trait system adds composable code generation. Each YAML capability maps to a trait that produces code sections. The composer merges outputs from multiple traits into final files.

```
YAML capabilities → Trait Registry → Resolve Chain → Compose → Files
```

Key components:
- **`trait.types.ts`** — Trait, TraitContext, TraitOutput interfaces
- **`trait.registry.ts`** — Register/lookup/resolve trait chains with dependency validation
- **`trait.composer.ts`** — Merges trait outputs, deduplicates imports, adds custom sections
- **Core traits** — crud, time-range, aggregation, soft-delete, export
- **`sql-helpers.ts`** — Storage-specific SQL (SQLite vs Postgres placeholders, functions)

See [traits.md](./traits.md) for usage and how to create new traits.

## Regeneration Layer (Phase 4)

Safe incremental regeneration: edit YAML → update generated code → preserve custom sections.

```
YAML changed → Change Detector → Smart Merge → Updated Files
                                     ↑
                              CUSTOM regions preserved
```

Key components:
- **`file-header.ts`** — `@generated` header with YAML hash for staleness detection
- **`yaml-hash.ts`** — SHA-256 hashing for change detection
- **`region-parser.ts`** — Parse GENERATED/CUSTOM regions
- **`smart-merge.ts`** — Replace generated sections, keep custom code
- **`change-detector.ts`** — Scan project for stale generated files

See [regeneration.md](./regeneration.md) for details.

## CI Enforcement Layer (Phase 5)

Automated validation that generated files match their source schemas.

```
PR opened → Generator Guard → validate-generated --strict
                                    ↓
                    ✅ pass (all fresh) or ❌ fail (stale/tampered)
```

Key components:
- **`validate-generated.ts`** — CLI command scanning all @generated files
- **`tampering-detector.ts`** — Detects hand-edits outside CUSTOM regions
- **`ratio-calculator.ts`** — Counts generated vs total files per package
- **`generator-guard.yml`** — GitHub Action blocking stale PRs

See [ci-enforcement.md](./ci-enforcement.md) for details.

## File Organization

```
packages/cli/src/schema/
├── index.ts                    # Barrel exports
├── entity-schema.types.ts      # Top-level EntitySchema type
├── field-schema.types.ts       # FieldSchema type
├── relation-schema.types.ts    # RelationSchema type
├── capability-schema.types.ts  # CapabilitySchema type
├── query-schema.types.ts       # QuerySchema type
├── field-types.ts              # FIELD_TYPES + SQLite mapping
├── reserved-words.ts           # Reserved word list
├── parse-yaml-file.ts          # YAML file reader
├── shape-validator.ts          # Structure validation
├── semantic-rules.ts           # Logic validation
├── dependency-graph.ts         # Graph builder + cycle detection
├── topological-sort.ts         # Dependency ordering
├── entity-schema.parser.ts     # Main parser entry point
├── entity-schema.validator.ts  # Main validator entry point
├── entity-schema.registry.ts   # Entity catalog
├── generate-typebox.ts         # TypeBox generator
├── generate-types-file.ts      # Types variants generator
├── generate-migration.ts       # SQLite migration generator
└── generate-entity-pipeline.ts # Pipeline orchestrator

packages/cli/src/traits/
├── index.ts                    # Barrel exports
├── trait.types.ts              # Core interfaces (Trait, TraitContext, TraitOutput)
├── trait.registry.ts           # Registration + dependency resolution
├── trait.composer.ts           # Composition engine
├── section-helpers.ts          # Empty section factory
├── sql-helpers.ts              # Storage-specific SQL helpers
├── register-defaults.ts       # Registers all built-in traits
├── crud.trait.ts               # CRUD operations trait
├── time-range.trait.ts         # Time-range query trait
├── aggregation.trait.ts        # Aggregation query trait
├── soft-delete.trait.ts        # Soft deletion trait
└── export.trait.ts             # CSV/JSON export trait

packages/cli/src/regeneration/
├── index.ts                    # Barrel exports
├── file-header.ts              # @generated header builder/parser
├── yaml-hash.ts                # SHA-256 content hashing
├── region-markers.ts           # BEGIN/END marker constants
├── region-parser.ts            # Parse regions from file content
├── smart-merge.ts              # Merge new generated + old custom
└── change-detector.ts          # Scan for stale generated files

packages/cli/src/validation/
├── index.ts                    # Barrel exports
├── tampering-detector.ts       # Detect hand-edits in generated regions
└── ratio-calculator.ts         # Generator coverage ratio
```
