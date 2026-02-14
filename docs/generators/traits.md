# Traits — Composable Code Generation Units

## What Are Traits?

Traits are small, composable code generators. Each trait produces code sections (imports, functions, types, SQL) that get merged into final generated files. Think of them as mixins for code generation.

## Built-in Traits

| Trait | Capability Key | Dependencies | What It Generates |
|-------|---------------|--------------|-------------------|
| CRUD | `crud` | none | create, findById, list, update, delete |
| Time Range | `time-range` | none | findByTimeRange, date indexes |
| Aggregation | `aggregation` | none | sum, avg, count, groupBy |
| Soft Delete | `soft-delete` | `crud` | deletedAt column, soft delete/restore |
| Export | `export` | `crud` | CSV/JSON export utilities |

## Usage in YAML

```yaml
name: Invoice
fields:
  amount:
    type: number
    required: true
capabilities:
  crud: true
  time-range: true
  aggregation: true
```

## Creating a New Trait

1. Create `packages/cli/src/traits/my-trait.trait.ts`
2. Implement the `Trait` interface
3. Register in `register-defaults.ts`
4. Add capability key to `capability-schema.types.ts`
5. Export from `index.ts`

```typescript
import type { Trait, TraitContext, TraitOutput } from './trait.types.js';

export function createMyTrait(): Trait {
  return {
    name: 'my-trait',
    description: 'What it does',
    dependencies: [],        // other trait names
    generate: (ctx) => ({ /* TraitOutput */ }),
  };
}
```

## Composition Rules

1. **Dependencies are auto-resolved** — `soft-delete` auto-includes `crud`
2. **Imports are deduplicated** — no duplicate import lines
3. **Circular deps throw** — traits cannot depend on each other
4. **Storage-aware** — traits receive the storage target (sqlite/postgres) and generate appropriate SQL

## Output Structure

Each trait produces a `TraitOutput` with three sections:
- **repository** — data access functions
- **route** — HTTP route handlers
- **migration** — SQL statements (indexes, columns)

Each section contains: `imports`, `types`, `functions`, `sql`, `routes`.

## Generated File Format

```typescript
/** @generated from EntityName YAML — Traits: crud, time-range */

import type { Entity } from '@flusk/types';

// ... generated code ...

// --- BEGIN CUSTOM ---
// Add custom code here. This section survives regeneration.
// --- END CUSTOM ---
```
