# AI Agent Instructions — Flusk Entity Development

## You are a YAML-only agent.

You modify **ONLY** files in `entities/*.yaml`. Everything else is generated automatically.

## Your workflow

```
1. Edit YAML  →  2. Run generator  →  3. Verify  →  4. Commit
```

### Step 1: Edit YAML

You may ONLY create or edit files matching `entities/*.entity.yaml`.

**Creating a new entity:**
```bash
./scripts/yaml-agent.sh create <entity-name>
# Then edit entities/<entity-name>.entity.yaml
```

**Modifying an existing entity:**
```bash
# Edit the YAML directly
# See docs/generators/yaml-guide.md for full reference
```

### Step 2: Run generator
```bash
./scripts/yaml-agent.sh generate entities/<name>.entity.yaml
```

### Step 3: Verify
```bash
pnpm test   # All tests must pass
pnpm lint   # Must be clean
```

### Step 4: Commit
```bash
git add entities/<name>.entity.yaml    # The YAML you edited
git add packages/                       # Generated files
git commit -m "feat: <description>"
```

## What you CANNOT do

❌ Edit any `.ts` file directly
❌ Edit files in `packages/` by hand
❌ Add `@generated` headers to existing files
❌ Modify `scripts/`, `.github/`, `docs/` 
❌ Change generator code (`packages/cli/src/`)
❌ Delete files outside `entities/`

## What you CAN do

✅ Create new `entities/*.entity.yaml` files
✅ Edit existing `entities/*.entity.yaml` files
✅ Run `./scripts/yaml-agent.sh generate|regenerate|validate|diff`
✅ Run `pnpm test` and `pnpm lint`
✅ Read any file for reference (but not edit)
✅ Edit `// --- BEGIN CUSTOM ---` sections in generated files (ONLY those sections)

## YAML Quick Reference

```yaml
name: MyEntity              # PascalCase
description: What it does   # Used in JSDoc + Swagger
storage: [sqlite]           # or [sqlite, postgres]

fields:
  fieldName:
    type: string            # string|integer|number|boolean|uuid|date|email|enum|json|reference
    required: true          # NOT NULL
    index: true             # DB index + countBy aggregation
    unique: true            # UNIQUE constraint
    default: "value"        # DEFAULT in migration
    min: 0                  # Validation
    max: 100
    description: "..."      # JSDoc

  status:
    type: enum
    values: [active, archived, deleted]
    required: true

  metadata:
    type: json
    default: "{}"

capabilities:
  crud: true                # create, findById, list, update, delete
  time-range: true          # findByTimeRange
  aggregation: true         # countBy, sum, sumSince

queries:                    # Custom queries beyond traits
  - name: findByStatus
    params:
      status: { type: string }
    where: "status = :status"
    order: "created_at DESC"
    returns: list           # single|list|scalar|raw
```

## If something goes wrong

- Generator output broken → **report it, don't fix the generated code**
- Test fails after generation → **check if YAML is correct first**
- Need a new field type → **report it as a generator limitation**
- Need complex business logic → **put it in CUSTOM section only**
