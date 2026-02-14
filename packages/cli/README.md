# @flusk/cli

CLI for analyzing LLM usage, generating code, and managing Flusk projects.

## Installation

```bash
npm install -g @flusk/cli
```

## Commands

### Analyze

Run your script with OTel instrumentation and collect LLM call data:

```bash
flusk analyze <script>              # Analyze a script
flusk analyze app.js --budget 5.00  # Fail if cost exceeds $5
flusk analyze app.js --runs 10      # Run 10 times, aggregate
flusk analyze app.js --export json  # Export raw data
flusk analyze app.js --compare <id> # Compare against previous run
```

### Reports

```bash
flusk report [id]    # Show analysis report (latest or by ID)
flusk history        # List past analysis runs
flusk budget         # Show budget status and spend trends
```

### Config

```bash
flusk init           # Interactive config wizard (creates flusk.config.json)
```

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
flusk g:sqlite-repo <name>     # SQLite repository from entity
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
barrel-updater, sqlite-repo

## Generated Files

All generated files include a `@generated` header. Do not edit
manually — regenerate with the CLI.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker 24+ (for infrastructure commands only)
