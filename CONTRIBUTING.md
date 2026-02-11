# Contributing to Flusk

Thanks for your interest in contributing! This guide will get you set up.

## Getting Started

```bash
# Fork & clone
git clone https://github.com/<your-username>/flusk.git
cd flusk

# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d postgres redis

# Run migrations
pnpm db:migrate

# Start dev server
pnpm dev
```

## Development Setup (without Docker)

You need PostgreSQL 16 (with pgvector) and Redis 7 running locally.

```bash
# Install deps
pnpm install

# Set env vars (copy and edit)
cp .env.example .env

# Run migrations
pnpm db:migrate

# Dev server with hot reload
pnpm dev        # http://localhost:3000
```

## Project Structure

```
packages/
  entities/         TypeBox schemas — the single source of truth for all data shapes
  types/            Derived TS types (Insert, Update, Query variants)
  business-logic/   Pure functions — NO database, NO HTTP, NO side effects
  resources/        DB repositories, migrations, Redis/OpenAI clients
  execution/        Fastify app: routes, plugins, hooks, middleware
  sdk/node/         Client SDK (OpenAI + Anthropic wrappers, tracing, routing)
  cli/              Code generators and project validators
```

**Data flows one way:** entities → types → business-logic → resources → execution

## Adding a New Feature

Always use the generator:

```bash
pnpm tsx packages/cli/bin/flusk.ts feature <name>
```

This scaffolds files across all packages: entity, types, business logic, repository, migration, routes, plugin, hooks, tests, and barrel exports.

After generating, customize the stubs — they're TODO-filled templates. Add real fields to entities, implement business logic, flesh out repository queries.

**Only create files manually** for edge cases that don't fit the generator pattern.

## Code Conventions

- **100-line file limit** — split into focused modules
- **Barrel imports only** — `@flusk/entities`, not `@flusk/entities/some-file`
- **Pure business logic** — no I/O in `packages/business-logic/`
- **TypeBox for schemas** — all entity definitions use TypeBox
- **Named exports only** — no default exports
- **kebab-case file names** — with suffixes: `.entity.ts`, `.function.ts`, `.repository.ts`, `.routes.ts`
- **`.js` extensions in imports** — required for ESM

## Testing

```bash
pnpm test          # All tests (vitest)
pnpm test:unit     # Business logic only
pnpm lint          # ESLint
pnpm lint:fix      # Auto-fix
```

Write tests for all business logic functions. Put tests next to the code: `validate-foo.test.ts` alongside `validate-foo.function.ts`.

## PR Process

1. Create a feature branch from `main`
2. Make focused, small commits
3. Ensure `pnpm test` and `pnpm lint` pass
4. Write a clear PR description: what changed and why
5. Link related issues

A good PR:
- Does one thing
- Has tests for new business logic
- Follows the file conventions
- Keeps files under 100 lines

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Be kind, be respectful, be constructive.
