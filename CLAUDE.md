# CLAUDE.md — Flusk AI Agent Guide

## What is Flusk?

LLM cost optimization platform. Tracks LLM API calls via OTel,
detects patterns (duplicate/similar prompts, overqualified models),
suggests cost-saving conversions, and generates performance profiles.

## Architecture (Monorepo)

```
packages/
  entities/       → TypeBox schemas (source of truth)
  types/          → Derived TS types (Insert, Update, Query)
  business-logic/ → Pure functions, NO I/O
  resources/      → DB repos, clients (pg, Redis, OpenAI), migrations
  execution/      → Fastify app: routes, plugins, hooks
  sdk/            → Client wrappers (OpenAI, Anthropic interceptors)
  cli/            → Code generators, validators, scaffolding
  otel/           → Zero-touch OTel auto-instrumentation
  logger/         → Structured logging (Pino)
```

## Entities (14 total)

base, llm-call, pattern, conversion, model-performance, routing-rule,
routing-decision, trace, span, optimization, prompt-template,
prompt-version, profile-session, performance-pattern

## File Conventions

- **Max 100 lines per file**
- **Naming:** `kebab-case.suffix.ts`
- **Suffixes:** `.entity.ts`, `.types.ts`, `.function.ts`,
  `.repository.ts`, `.routes.ts`, `.plugin.ts`, `.hooks.ts`,
  `.middleware.ts`, `.client.ts`, `.test.ts`
- **Barrel exports:** Every package has `src/index.ts`
- **Imports:** `@flusk/entities`, `@flusk/types`, `@flusk/resources`,
  `@flusk/business-logic`, `@flusk/logger`
- **Logging:** Use `@flusk/logger`, not `console.log`

## Adding Features

### Always use the generator

```bash
pnpm tsx packages/cli/bin/flusk.ts g feature <name>
```

### Available Generators

entity-schema, types, resources, business-logic, execution, feature,
feature-test, route, plugin, middleware, service, fastify-plugin,
otel-hook, detector, profile, provider, package, infrastructure,
docker-compose, dockerfile, entrypoint, env, swagger, watt, test,
barrel-updater

### Generator Known Gaps

- Repo template creates own pool — use shared `getPool()`
- Route template is single file — split for complex features
- No support for entities without BaseEntitySchema
- Barrel updaters append without checking existing exports

## Key Patterns

### Entity Schema (TypeBox)
```typescript
import { Type, Static } from '@sinclair/typebox';
import { BaseEntitySchema } from './base.entity.js';

export const FooEntitySchema = Type.Composite([
  BaseEntitySchema,
  Type.Object({ name: Type.String() })
]);
export type FooEntity = Static<typeof FooEntitySchema>;
```

### Business Logic (pure functions)
```typescript
export function validateFoo(entity: Partial<FooEntity>) {
  const errors: string[] = [];
  if (!entity.name) errors.push('name is required');
  return { valid: errors.length === 0, errors };
}
```

## Commands

```bash
pnpm test       # All tests (vitest)
pnpm dev        # Dev server with hot reload
pnpm build      # Build all packages
pnpm db:migrate # Run migrations
pnpm lint       # ESLint
```

## Important Rules

1. Keep files under 100 lines
2. Business logic must be pure — no DB, no HTTP
3. Entity changes flow from `packages/entities/`
4. Use `.js` extensions in imports (ESM)
5. Don't edit `@generated` files — regenerate with CLI
6. Use `@flusk/logger` for all logging
