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
    ┌────┼────┬──────────┐
    ▼    ▼    ▼          ▼
  TypeBox  Types  Migration  (future: repo, routes, tests)
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
- Loads all `.entity.yaml` files from `entities/` directory
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
```
