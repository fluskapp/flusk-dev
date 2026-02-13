# Contributing to Flusk

## Quick Setup

```bash
git clone https://github.com/<your-username>/flusk-dev.git
cd flusk-dev
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev                    # http://localhost:3000
```

## Without Docker

PostgreSQL 16 (with pgvector) and Redis 7 running locally.

```bash
cp .env.example .env
pnpm install && pnpm db:migrate && pnpm dev
```

## Adding Features

**Always use the generator:**

```bash
pnpm tsx packages/cli/bin/flusk.ts g feature <name>
```

This scaffolds entity, types, business logic, repository, migration,
routes, plugin, hooks, tests, and barrel exports.

### Available Generators

entity-schema, types, resources, business-logic, execution, feature,
feature-test, route, plugin, middleware, service, fastify-plugin,
otel-hook, detector, profile, provider, package, infrastructure,
docker-compose, dockerfile, entrypoint, env, swagger, watt, test,
barrel-updater

**Only create files manually** for genuine edge cases.

## Code Conventions

- **100-line file limit** — split into focused modules
- **Barrel imports only** — `@flusk/entities`, not deep paths
- **Pure business logic** — no I/O in `packages/business-logic/`
- **TypeBox schemas** — all entities use TypeBox
- **Named exports only** — no default exports
- **kebab-case filenames** — with suffixes: `.entity.ts`, `.function.ts`
- **`.js` extensions** in imports (ESM)
- **Use `@flusk/logger`** for logging, not `console.log`

## Testing

```bash
pnpm test           # All tests (vitest)
pnpm test:unit      # Business logic only
pnpm lint           # ESLint
```

Write tests for all business logic. Place tests next to the code.

## PR Process

1. Fork & create a feature branch from `main`
2. Make focused, small commits
3. Ensure `pnpm test` and `pnpm lint` pass
4. Write a clear PR description
5. Link related issues

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
