# Entity YAML Guide

## Why YAML?
- Single source of truth for every entity
- AI agents and humans edit YAML only — everything else is generated
- Change YAML → run `flusk regenerate` → all code updates automatically

## Quick Start
Create `packages/schema/entities/<entity-name>.entity.yaml` and run:
```bash
flusk recipe full-entity --from packages/schema/entities/<name>.entity.yaml
```

## Schema Reference

### Required Fields
- `name` (PascalCase) — entity name, e.g. `LLMCall`, `BudgetAlert`
- `description` — what this entity represents
- `storage` — array: `[sqlite]`, `[postgres]`, or `[sqlite, postgres]`
- `fields` — field definitions (see below)

### Field Types
| Type | SQLite | Postgres | TypeBox | Notes |
|------|--------|----------|---------|-------|
| string | TEXT | TEXT | Type.String | General text |
| integer | INTEGER | INTEGER | Type.Integer | Whole numbers |
| number | REAL | DOUBLE PRECISION | Type.Number | Decimals (costs, scores) |
| boolean | INTEGER (0/1) | BOOLEAN | Type.Boolean | true/false |
| uuid | TEXT | UUID | Type.String({format:'uuid'}) | References |
| date | TEXT | TIMESTAMP WITH TIME ZONE | Type.String({format:'date-time'}) | ISO 8601 |
| email | TEXT | TEXT | Type.String({format:'email'}) | Validated email |
| enum | TEXT | TEXT | Type.Union([Type.Literal(...)]) | Fixed set of values |
| json | TEXT | JSONB | Type.Unknown() | Serialized objects |
| reference | TEXT | UUID | Type.String({format:'uuid'}) | FK to another entity |

### Field Properties
- `required: true/false` — NOT NULL constraint (default: false)
- `index: true` — creates DB index + generates `countBy<Field>` aggregation
- `unique: true` — UNIQUE constraint
- `default: <value>` — DEFAULT in migration. Booleans: true/false. JSON: "{}" or "[]"
- `min/max` — validation constraints (string length or numeric range)
- `description` — used in JSDoc and Swagger

### Capabilities
```yaml
capabilities:
  crud: true        # create, findById, list, update, delete
  time-range: true  # findByTimeRange(from, to)
  aggregation: true # countBy (indexed fields), sum (numeric fields), sumSince
  soft-delete: true # deletedAt instead of real delete
  export: true      # toCSV, toJSON
```

### Custom Queries
For queries beyond standard traits:

```yaml
queries:
  # Standard query — built from where/order/limit
  - name: findByPromptHash
    description: Find by prompt hash
    params:
      hash: { type: string }
    where: "prompt_hash = :hash"
    order: "created_at DESC"
    limit: 1
    returns: single  # single entity or null

  # Raw SQL — for complex queries
  - name: countDuplicates
    description: Count duplicated prompts
    type: raw-sql
    sql: |
      SELECT COALESCE(SUM(cnt), 0) as total FROM (
        SELECT COUNT(*) as cnt FROM table_name
        GROUP BY prompt_hash HAVING COUNT(*) > 1
      )
    returns: scalar  # returns number

  # List query
  - name: findByProfileId
    params:
      profileSessionId: { type: string }
    where: "profile_session_id = :profileSessionId"
    order: "severity ASC, created_at DESC"
    returns: list  # returns Entity[]

  # Raw query with custom interface
  - name: countByModel
    type: raw-sql
    sql: "SELECT model, COUNT(*) as count FROM table_name GROUP BY model"
    returns: raw  # returns raw rows, generates interface from column names
```

### Relations (future)
```yaml
relations:
  calls:
    entity: LlmCall
    type: has-many
    foreign_key: session_id
```

### Auto-generated Fields (DO NOT add to YAML)
These are added automatically:
- `id` — UUID primary key
- `createdAt` — creation timestamp
- `updatedAt` — last update timestamp

## Rules for AI Agents

1. **NEVER create entity files by hand.** Always create YAML first, then generate.
2. **NEVER edit files with `@generated` header.** Edit the YAML and regenerate.
3. **Custom business logic** goes in `// --- BEGIN CUSTOM ---` sections only.
4. **Every field must have a `description`** — it becomes JSDoc and Swagger docs.
5. **Use `index: true`** on fields you'll query by — it creates both DB index and aggregation functions.
6. **Use exact types** — don't use `string` for what should be `boolean` or `json`.
7. **Test after generating** — run `pnpm test` to verify.

## Examples

### Minimal Entity
```yaml
name: Tag
description: Simple label tag
storage: [sqlite]
fields:
  label:
    type: string
    required: true
    unique: true
capabilities:
  crud: true
```

### Full Entity
See `packages/schema/entities/llm-call.entity.yaml` for a complete example with:
- Multiple field types (string, number, boolean, json)
- Indexed fields for aggregation
- Default values
- Custom queries (standard, raw-sql, scalar, raw)
- CRUD + aggregation + time-range capabilities

## Validation
Run `flusk validate-generated` to check all generated files are up to date.
Run `flusk ratio` to check generator coverage.
