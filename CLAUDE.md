# CLAUDE.md — Flusk AI Agent Guide

## What is Flusk?

LLM cost optimization platform. It tracks LLM API calls, detects patterns (duplicate/similar prompts), and suggests cost-saving conversions (caching, model downgrade).

## Architecture (Monorepo)

```
packages/
  entities/      → TypeBox schemas (source of truth for data shapes)
  types/         → Derived TS types + JSON schemas (Insert, Update, Query variants)
  business-logic/→ Pure functions, NO I/O, NO side effects (deterministic & testable)
  resources/     → DB repositories, clients (pg, Redis, OpenAI), migrations
  execution/     → Fastify app: routes, plugins, hooks, middleware
  sdk/           → Client wrappers (OpenAI, Anthropic interceptors)
  cli/           → Code generators, validators, project scaffolding
```

## File Conventions

- **Max 100 lines per file** — split into focused modules
- **Naming:** `kebab-case.suffix.ts` — e.g., `llm-call.entity.ts`, `calculate-cost.function.ts`
- **Suffixes:** `.entity.ts`, `.types.ts`, `.function.ts`, `.repository.ts`, `.routes.ts`, `.plugin.ts`, `.hooks.ts`, `.middleware.ts`, `.client.ts`, `.test.ts`
- **Barrel exports:** Every package has `src/index.ts` re-exporting public API
- **Imports:** Use `@flusk/entities`, `@flusk/types`, `@flusk/resources`, `@flusk/business-logic`

## Adding a New Feature (Step-by-Step)

### ⚠️ ALWAYS use the generator — no exceptions

**Rule: All code must be generated via the CLI generators whenever possible.** This includes new features, refactors, pivots, and architectural changes. The majority of code should come from generators — manual code is only for customizing the generated stubs. If a refactor/pivot requires new patterns the generator doesn't support yet, **update the generator first**, then use it to generate the code.

```bash
# From project root:
pnpm tsx packages/cli/bin/flusk.ts feature <name>

# Example:
pnpm tsx packages/cli/bin/flusk.ts feature billing-plan
```

This creates all files across all packages and wires them together (entity, types, business-logic, repository, migration, routes, plugin, hooks, test, barrel exports, app.ts registration).

**Why this matters:** Manual file creation leads to inconsistent patterns (naming, barrel exports, missing files). The generator ensures every feature follows the same structure. Only create files manually for edge cases that genuinely don't fit the generator pattern (e.g., entities that don't extend BaseEntitySchema, or domain-specific type variants like Upsert instead of Insert/Update).

**After generating:** Customize the stubs — the generator creates TODO-filled templates. Edit entities to add real fields, implement business logic, and flesh out repository queries. If routes need to be split into multiple files for the 100-line rule, create a `<name>-routes/` directory.

### Generator known gaps (as of 2026-02)

- Repository template creates a single file with its own pool — real repos should use the shared `getPool()` from `../db/pool.js`
- Route template is a single file — complex features may need a directory with split handlers
- No support for entities that don't extend BaseEntitySchema (e.g., immutable records without updatedAt)
- Generated barrel updaters append but don't check for existing exports

### Option B: Manual (LAST RESORT — only if generator genuinely can't handle it)

**Before writing manual code:** Consider if the generator should be extended to handle this case. Prefer updating the generator over manual code.

1. **Entity** — `packages/entities/src/<name>.entity.ts`
   - Define TypeBox schema extending `BaseEntitySchema`
   - Export `<Name>EntitySchema` and `type <Name>Entity`
   - Update `packages/entities/src/index.ts`

2. **Types** — `packages/types/src/<name>.types.ts`
   - Create Insert, Update, Query schema variants
   - Update `packages/types/src/index.ts`

3. **Business Logic** — `packages/business-logic/src/<name>/`
   - Pure validation/transformation functions
   - `validate-<name>.function.ts`, `index.ts`
   - Update `packages/business-logic/src/index.ts`

4. **Repository** — `packages/resources/src/repositories/<name>.repository.ts`
   - CRUD operations using pg Pool
   - Update `packages/resources/src/index.ts`

5. **Migration** — `packages/resources/src/migrations/<NNN>_<name>s.sql`

6. **Routes** — `packages/execution/src/routes/<name>.routes.ts`
   - Fastify route handlers with TypeBox schemas

7. **Plugin** — `packages/execution/src/plugins/<name>.plugin.ts`
   - Wraps routes with `fastify-plugin`

8. **Hooks** — `packages/execution/src/hooks/<name>.hooks.ts`
   - preHandler, onSend hooks

9. **Register** — Add route import + registration in `packages/execution/src/app.ts`

10. **Tests** — `packages/business-logic/src/<name>/validate-<name>.test.ts`

## Key Patterns

### Entity Schema (TypeBox)
```typescript
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const FooEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({
    name: Type.String({ description: 'Foo name' }),
  })
]);
export type FooEntity = Static<typeof FooEntitySchema>;
```

### Business Logic (pure functions)
```typescript
export function validateFoo(entity: Partial<FooEntity>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!entity.name) errors.push('name is required');
  return { valid: errors.length === 0, errors };
}
```

### Route Registration (app.ts)
```typescript
await api.register(fooRoutes, { prefix: '/foos' });
```

## Commands

```bash
pnpm test              # Run all tests (vitest)
pnpm dev               # Dev server with hot reload
pnpm build             # Build all packages
pnpm db:migrate        # Run migrations
```

## CLI Commands (use `pnpm tsx packages/cli/bin/flusk.ts <command>`)

### `flusk feature <name>` — Full feature scaffolding
Generates entity, types, business-logic, repository, migration, routes, plugin, hooks, tests, barrel exports, and app.ts registration.
```bash
flusk feature billing-plan
flusk feature billing-plan --skip-entity --skip-tests  # partial scaffolding
flusk feature billing-plan --dry-run                   # preview only
```
Skip flags: `--skip-entity`, `--skip-routes`, `--skip-tests`, `--skip-migration`

### `flusk package <name>` — Create a new monorepo package
Creates `packages/<name>/` with package.json, tsconfig, barrel export, config, README.
```bash
flusk package analytics
```

### `flusk validate` — Enforce project conventions
Checks: max 100 lines, no deep imports, no default exports, kebab-case filenames.
```bash
flusk validate
```

### `flusk migrate-new <name>` — Create a new SQL migration
Auto-numbers and creates migration in `packages/resources/src/migrations/`.
```bash
flusk migrate-new add-billing-tables
```

### `flusk route <name>` — Standalone route (no entity/repo)
Creates route directory with handler and registers in app.ts.
```bash
flusk route webhook --prefix /webhooks
```

### Legacy validation commands
```bash
flusk validate:schema     # Validate TypeBox entity schemas
flusk validate:structure  # Check project structure
flusk validate:config     # Validate config files
```

## Testing

- **Framework:** Vitest
- **Business logic tests:** `packages/business-logic/src/<name>/*.test.ts`
- **Integration tests:** `tests/integration/`
- **Run:** `pnpm test` (all) or `pnpm test:unit` (packages only)

## Important Rules

1. Keep files under 100 lines
2. Business logic must be pure — no DB, no HTTP, no side effects
3. All entity changes flow from `packages/entities/` (single source of truth)
4. Use `.js` extensions in imports (ESM)
5. Don't edit `@generated` files directly — regenerate with CLI
