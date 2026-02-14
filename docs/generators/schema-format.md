# Entity YAML Schema Format

## Why YAML?

YAML is human-readable, diff-friendly, and well-supported by every editor. It's the right balance between structure (for generators) and readability (for humans and AI agents).

## Top-Level Structure

```yaml
name: MyEntity          # PascalCase, required
description: What it does  # Human-readable, optional
storage: [sqlite]       # Storage backends, optional (default: [sqlite])

fields:
  fieldName:            # camelCase field names
    type: string        # Required
    required: true      # Optional, default: false
    # ... more options

relations:              # Optional
  parentEntity:
    entity: ParentEntity
    type: belongs-to

capabilities:           # Optional
  crud: true
  time-range: true
```

## Field Types

| Type | SQLite | TypeBox | Description |
|------|--------|---------|-------------|
| `string` | TEXT | `Type.String()` | UTF-8 text |
| `integer` | INTEGER | `Type.Integer()` | Whole numbers |
| `number` | REAL | `Type.Number()` | Floating point |
| `boolean` | INTEGER | `Type.Boolean()` | 0/1 in SQLite |
| `uuid` | TEXT | `Type.String({ format: 'uuid' })` | UUID v4 |
| `date` | TEXT | `Type.String({ format: 'date-time' })` | ISO 8601 |
| `email` | TEXT | `Type.String({ format: 'email' })` | Email address |
| `enum` | TEXT | `Type.Union([...Literal])` | Must include `values` |
| `reference` | TEXT | `Type.String({ format: 'uuid' })` | FK to another entity |
| `json` | TEXT | `Type.Unknown()` | Serialized JSON |
| `array` | TEXT | `Type.Array(Type.Unknown())` | Serialized array |

## Field Options

```yaml
fieldName:
  type: string          # Required
  required: true        # Generate NOT NULL in SQL
  index: true           # Generate CREATE INDEX
  unique: true          # Generate UNIQUE constraint
  default: "value"      # DEFAULT in SQL + TypeBox default
  min: 0                # minimum (numbers) or minLength (strings)
  max: 100              # maximum / maxLength
  precision: 6          # Decimal precision (number type)
  description: "..."    # JSDoc + SQL comment
  values: [a, b, c]     # Only for enum type
  format: "uuid"        # Format hint for string type
```

## Relations

```yaml
relations:
  parent:
    entity: ParentEntity    # Target entity (PascalCase)
    type: belongs-to        # belongs-to | has-many | has-one
    foreignKey: parentId    # Optional, auto-derived if omitted
    cascade: cascade        # cascade | set-null | restrict (default)
    description: "..."      # Optional
```

### Relation Types

- **`belongs-to`**: This entity has a FK column pointing to parent. Generates FOREIGN KEY constraint.
- **`has-many`**: Parent has many of this entity. No FK on this side (FK is on the other entity).
- **`has-one`**: Parent has exactly one of this entity.

## Capabilities

```yaml
capabilities:
  crud: true            # Generate create/findById/list/update/delete
  time-range: true      # Generate findByTimeRange + time indexes
  aggregation: true     # Generate sum/avg/groupBy methods
  export: true          # Generate CSV/JSON export
  soft-delete: true     # Use deletedAt instead of hard delete
  audit: true           # Track createdBy/updatedBy
```

## Complete Example

```yaml
name: LLMCall
description: A single LLM API call with cost tracking
storage: [sqlite]

fields:
  provider:
    type: string
    required: true
    description: LLM provider name
    min: 1

  model:
    type: string
    required: true
    index: true
    description: Model identifier

  cost:
    type: number
    required: true
    min: 0
    default: 0

  severity:
    type: enum
    required: true
    values: [critical, high, medium, low]

capabilities:
  crud: true
  aggregation: true
  time-range: true
```
