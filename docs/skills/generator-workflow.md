# Skill: Generator Workflow

How to add/modify entities and features in Flusk using the generator-first approach.

## New Entity
```bash
# 1. Create YAML
vim packages/schema/entities/<name>.entity.yaml

# 2. Generate everything
pnpm tsx packages/cli/bin/flusk.ts recipe full-entity --from packages/schema/entities/<name>.entity.yaml

# 3. Verify
pnpm lint && pnpm test && pnpm tsx scripts/check-generated.ts
```

## Modify Entity
```bash
# 1. Edit YAML
vim packages/schema/entities/<name>.entity.yaml

# 2. Regenerate
pnpm tsx packages/cli/bin/flusk.ts regenerate

# 3. Re-add custom code in // --- BEGIN CUSTOM --- sections
# 4. Verify
pnpm lint && pnpm test
```

## New Feature (full stack)
```bash
pnpm tsx packages/cli/bin/flusk.ts g feature <name>
```

## Individual Generators
```bash
pnpm tsx packages/cli/bin/flusk.ts g entity-schema <name>
pnpm tsx packages/cli/bin/flusk.ts g types <name>
pnpm tsx packages/cli/bin/flusk.ts g resources <name>
pnpm tsx packages/cli/bin/flusk.ts g business-logic <name>
pnpm tsx packages/cli/bin/flusk.ts g execution <name>
pnpm tsx packages/cli/bin/flusk.ts g route <name>
pnpm tsx packages/cli/bin/flusk.ts g test <name>
```

## YAML Reference
See `docs/generators/yaml-guide.md`

## Rules
- NEVER edit `@generated` files directly
- Only edit `// --- BEGIN CUSTOM ---` sections
- SQL must use `--` comments (not `/** */`)
- Run `pnpm tsx scripts/check-generated.ts` before committing
