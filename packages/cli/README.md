# @flusk/cli

Code generator and project management CLI for Flusk.

## Usage

```bash
pnpm tsx packages/cli/bin/flusk.ts <command>
```

## Commands

### Code Generation

```bash
flusk g <entity-file>          # Generate all layers from entity
flusk g --all                  # Generate from all entities
flusk g <entity> --types-only  # Types package only
flusk g <entity> --dry-run     # Preview changes
```

### Feature Scaffolding

```bash
flusk g feature <name>         # Full feature (all packages)
flusk g feature <name> --skip-entity --skip-tests
```

### Project Management

```bash
flusk init <project-name>      # New Flusk project
flusk package <name>           # New monorepo package
flusk env:setup                # Interactive .env creation
flusk env:validate             # Validate environment
flusk validate                 # Check conventions (100-line, etc.)
```

### Infrastructure

```bash
flusk infra:up                 # Start Docker services
flusk infra:down               # Stop services
flusk infra:reset              # Reset (deletes data)
flusk infra:logs [service]     # View logs
```

### Database

```bash
flusk migrate                  # Run pending migrations
flusk migrate-new <name>       # Create new migration
```

### Profiling

```bash
flusk g:profile                # Scaffold profiling config
flusk profile run <entry>      # Profile server
flusk profile analyze <file>   # Analyze profile
```

## Available Generators

entity-schema, types, resources, business-logic, execution, feature,
feature-test, route, plugin, middleware, service, fastify-plugin,
otel-hook, detector, profile, provider, package, infrastructure,
docker-compose, dockerfile, entrypoint, env, swagger, watt, test,
barrel-updater

## Generated Files

All generated files include a `@generated` header. Do not edit
manually — regenerate with the CLI.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker 24+ (for infrastructure commands)
