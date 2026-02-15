# @flusk/schema

Entity YAML definitions — the single source of truth for all generated code.

Each `.entity.yaml` defines an entity's fields, capabilities, queries, and API config.
Running `flusk sync` reads these files and generates code across all packages.

## Adding a New Entity

1. Create `entities/my-entity.entity.yaml`
2. Run `flusk sync`
3. Done — all layers generated automatically

## Files

This package contains NO code. Only YAML schemas.
The generated code lives in `@flusk/entities` (TypeBox) and `@flusk/types` (TS types).
