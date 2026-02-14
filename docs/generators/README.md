# Flusk Generator System

## Philosophy: Schema-First Code Generation

The generator is not a tool — it **is** the architecture.

When the schema is the source of truth, code is just a projection of it. Change the schema → everything updates automatically across all layers.

### Why Schema-First?

1. **Single Source of Truth**: One YAML file defines an entity. TypeBox schemas, SQLite migrations, types — all derived from it.
2. **Consistency by Construction**: Generated code follows the same patterns every time. No copy-paste drift.
3. **AI-Friendly**: AI agents don't write boilerplate — they write schemas and business logic. Everything else is generated.
4. **Auditable**: Every generated file traces back to a YAML definition. You can verify the entire codebase matches its schemas.

### What Gets Generated

From a single `entities/foo.entity.yaml`:

| Output | Package | Description |
|--------|---------|-------------|
| `foo.entity.ts` | `@flusk/entities` | TypeBox schema with full type definitions |
| `foo.types.ts` | `@flusk/types` | Insert/Update/Query variants |
| `foo.sql` | `@flusk/resources` | SQLite CREATE TABLE + indexes |

### Usage

```bash
# Generate from a single YAML
flusk generate:entity --from entities/llm-call.entity.yaml

# Load and validate all entities
# (programmatic — used by other generators)
import { loadEntityRegistry } from '@flusk/cli/schema';
const registry = loadEntityRegistry('./entities');
```

### What Stays Manual

- **Business logic** — that's where the real value is
- **Custom queries** — beyond CRUD, your domain logic
- **Route handlers** — generated stubs, but logic is yours

### Roadmap

- Phase 2: Trait system (crud, time-range, aggregation mixins)
- Phase 3: Recipe system (one command → 8+ files)
- Phase 4: Regeneration with protected regions
- Phase 5: CI enforcement and coverage tracking
