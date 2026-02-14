# Recipes — Composable Code Generation

Recipes are ordered pipelines of generator steps. One command → many files.

## Built-in Recipes

### `full-entity`
Generates all files for an entity from a YAML schema.

```bash
flusk recipe full-entity --from entities/llm-call.entity.yaml
flusk recipe full-entity --from entities/llm-call.entity.yaml --dry-run
```

**Produces:** TypeBox schema, types, SQLite migration, repository (with traits), routes, barrel exports.

### `cli-command`
Scaffolds a new CLI command with test.

```bash
flusk recipe cli-command --name budget --description "Show budget status"
```

**Produces:** Command file + test file in `packages/cli/src/commands/`.

### `fastify-plugin`
Scaffolds a Fastify plugin with fp wrapper and test.

```bash
flusk recipe fastify-plugin --name rate-limiter
flusk recipe fastify-plugin --name cache --with-config --with-decorator
```

**Produces:** Plugin file + test in target package.

## Listing Recipes

```bash
flusk recipe list
```

## Dry Run

Add `--dry-run` to any recipe to preview without writing files:

```bash
flusk recipe full-entity --from entities/user.entity.yaml --dry-run
```

## Creating Custom Recipes

1. Define steps implementing `RecipeStep` (see `recipe.types.ts`)
2. Create a `Recipe` object with ordered steps
3. Register via `registerRecipe()` in `register-defaults.ts`

Each step receives a `RecipeContext` with shared state between steps. Steps return files created and optional shared data for downstream steps.

### Example

```typescript
import type { Recipe, RecipeStep } from '../recipes/recipe.types.js';

const myStep: RecipeStep = {
  name: 'generate-thing',
  description: 'Generate the thing',
  async run(ctx) {
    // Use writeRecipeFile() helper for dry-run support
    return { files: [{ path: '/out/thing.ts', action: 'created' }] };
  },
  when: (ctx) => ctx.options['enabled'] === true, // optional condition
};

export const myRecipe: Recipe = {
  name: 'my-recipe',
  description: 'Does the thing',
  steps: [myStep],
};
```

## Architecture

```
YAML → Recipe Runner → Step 1 → Step 2 → ... → Step N → Result
                         ↕         ↕               ↕
                    RecipeContext (shared state, generated files list)
```

- **Rollback:** If any step fails, all previously generated files are deleted.
- **Timing:** Every step is logged with duration via Pino.
- **Hooks:** `before`/`after` hooks for setup/teardown (e.g., registering traits).
