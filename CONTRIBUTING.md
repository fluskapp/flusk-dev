# Contributing to Flusk

## Quick Setup

No Docker needed for development:

```bash
git clone https://github.com/<your-username>/flusk-dev.git
cd flusk-dev
pnpm install
pnpm test
```

Try the CLI locally:

```bash
pnpm tsx packages/cli/bin/flusk.ts analyze <your-script.js>
```

### Server Mode (optional)

Docker is only needed for server-mode integration tests (PostgreSQL + Redis):

```bash
docker compose up -d postgres redis
cp .env.example .env
pnpm db:migrate
pnpm dev                    # http://localhost:3000
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
barrel-updater, sqlite-repo

## Code Conventions

- **100-line file limit** — split into focused modules
- **Barrel imports only** — `@flusk/entities`, not deep paths
- **Pure business logic** — no I/O in `packages/business-logic/`
- **TypeBox schemas** — all entities use TypeBox
- **Named exports only** — no default exports
- **kebab-case filenames** — with suffixes: `.entity.ts`, `.function.ts`
- **`.js` extensions** in imports (ESM)
- **Use `@flusk/logger`** for logging, not `console.log`
- **`node:sqlite`** — SQLite storage uses Node.js built-in, zero external deps

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
