# Generator System — Instructions for AI Agents

## Golden Rules

1. **NEVER edit files with `@generated` header directly**
2. Only `// --- BEGIN CUSTOM ---` sections may be hand-edited
3. Run `flusk validate-generated` before committing
4. Run `flusk ratio` to check generator coverage

## Workflows

### Change an entity
1. Edit `entities/<name>.entity.yaml`
2. Run `flusk regenerate`

### Add a new entity
1. Create YAML in `entities/`
2. Run `flusk recipe full-entity --from <yaml>`

### Add behavior to an entity
1. Add capability to the entity's YAML
2. Run `flusk regenerate`

### Add custom business logic
1. Find the CUSTOM region in the relevant generated file
2. Add code between `BEGIN CUSTOM` and `END CUSTOM` markers
3. This code survives regeneration

## File Structure

```
entities/*.entity.yaml    → Source of truth
packages/entities/src/    → Generated TypeBox schemas
packages/types/src/       → Generated TS types
packages/resources/src/   → Generated repos + migrations
packages/execution/src/   → Generated routes
```

## CI Checks

- `flusk validate-generated --strict` runs on every PR
- Stale or tampered files block merging
- Fix with `flusk regenerate`

## Available Traits

crud, time-range, aggregation, soft-delete, export

## Available Recipes

full-entity, cli-command, fastify-plugin
