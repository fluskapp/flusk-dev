# Contributing to Flusk

Thanks for your interest in contributing! 🎉

## Quick Setup

```bash
git clone https://github.com/<your-username>/flusk.git
cd flusk
pnpm install
docker compose up -d postgres redis
pnpm db:migrate
pnpm dev                    # http://localhost:3000
```

## Without Docker

You need PostgreSQL 16 (with pgvector) and Redis 7 running locally.

```bash
cp .env.example .env        # edit with your DB/Redis URLs
pnpm install && pnpm db:migrate && pnpm dev
```

## Adding Features

**Always use the generator:**

```bash
pnpm tsx packages/cli/bin/flusk.ts feature <name>
```

This scaffolds entity, types, business logic, repository, migration, routes,
plugin, hooks, tests, and barrel exports. Customize the generated stubs after.

**Only create files manually** for genuine edge cases.

## Code Conventions

- **100-line file limit** — split into focused modules
- **Barrel imports only** — `@flusk/entities`, not deep paths
- **Pure business logic** — no I/O in `packages/business-logic/`
- **TypeBox schemas** — all entities use TypeBox
- **Named exports only** — no default exports
- **kebab-case filenames** — with suffixes: `.entity.ts`, `.function.ts`, etc.
- **`.js` extensions** in imports (ESM)

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

## Good First Issues

Look for issues labeled [`good first issue`](https://github.com/AdirBenYossef/flusk/labels/good%20first%20issue).

## Code of Conduct

See [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
