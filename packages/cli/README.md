# @flusk/cli

Code generator and infrastructure management CLI for the Flusk platform. Generates types, repositories, migrations, business logic, and execution layer code from entity schema definitions. Manages project initialization, environment configuration, and Docker infrastructure.

## Installation

The CLI is part of the Flusk monorepo workspace.

```bash
# Install in monorepo
pnpm install

# Build CLI
cd packages/cli
pnpm build
```

## Quick Start

```bash
# Initialize a new Flusk project
flusk init my-api-project

# Setup environment configuration
cd my-api-project
flusk env:setup

# Start infrastructure (PostgreSQL + Redis)
flusk infra:up

# Generate code from entity
flusk g user.entity.ts

# Run migrations
flusk migrate
```

## Commands

### Project Initialization

#### `flusk init [project-name]`

Initialize a new Flusk project with complete infrastructure setup.

**Creates:**
- Project directory structure (`packages/entities`, `types`, `resources`, `business-logic`, `execution`, `sdk`, `cli`)
- Infrastructure files (`.gitignore`, `docker-compose.yml`, `.env.example`, `watt.json`)
- Package configuration (`package.json`, `tsconfig.json`)
- Installs dependencies automatically

**Options:**
- `--force` - Overwrite existing files without confirmation
- `--no-install` - Skip dependency installation
- `--template <name>` - Use a project template (default: basic)

**Example:**
```bash
# Create new project
flusk init my-api-project

# With options
flusk init my-project --force --no-install
```

**Success Output:**
```
🚀 Initializing Flusk project: my-api-project

✅ Created project structure
✅ Generated .gitignore
✅ Generated docker-compose.yml
✅ Generated .env.example
✅ Generated watt.json
✅ Generated package.json
✅ Installed dependencies (12.3s)

✨ Project created successfully!

Next steps:
  1. cd my-api-project
  2. cp .env.example .env
  3. flusk infra:up
  4. flusk create:entity
```

### Environment Management

#### `flusk env:setup`

Interactively create `.env` file from `.env.example` template.

**Features:**
- Prompts for each required environment variable
- Auto-generates secure values for secrets (JWT_SECRET)
- Validates URL formats and port ranges
- Warns before overwriting existing `.env`

**Example:**
```bash
flusk env:setup
```

**Interactive Flow:**
```
? DATABASE_URL: postgresql://flusk:secret@localhost:5432/flusk
? REDIS_URL: redis://localhost:6379
? PORT: 3000
? NODE_ENV: development
✅ Generating JWT_SECRET (auto-generated 32+ characters)

✅ Created .env file
```

#### `flusk env:validate`

Validate environment configuration against requirements.

**Validates:**
- Presence of required variables
- URL format for DATABASE_URL and REDIS_URL
- Port ranges (1-65535)
- JWT_SECRET length (minimum 32 characters)
- NODE_ENV values (development | production | test)

**Example:**
```bash
flusk env:validate
```

**Success Output:**
```
🔍 Validating environment variables...

✅ DATABASE_URL (valid PostgreSQL URL)
✅ REDIS_URL (valid Redis URL)
✅ JWT_SECRET (32+ characters)
✅ PORT (3000, valid range)
✅ NODE_ENV (development)

All environment variables valid!
```

**Error Output:**
```
🔍 Validating environment variables...

✅ DATABASE_URL (valid PostgreSQL URL)
❌ REDIS_URL (missing)
❌ JWT_SECRET (too short: 16 characters, minimum 32)
✅ PORT (3000, valid range)

Validation failed. Fix errors above.
[Exit code: 1]
```

### Infrastructure Management

#### `flusk infra:up`

Start Docker infrastructure services (PostgreSQL 16 + pgvector, Redis 7).

**Pre-flight Checks:**
- Validates Docker is installed and running
- Checks for port conflicts (5432, 6379, 8080, 8001)
- Validates `docker-compose.yml` exists

**Services Started:**
- PostgreSQL 16 with pgvector extension (port 5432)
- Redis 7 with persistence (port 6379)
- Adminer database UI (port 8080)
- RedisInsight Redis UI (port 8001)

**Options:**
- `--timeout <seconds>` - Health check timeout (default: 60)
- `--pull` - Pull latest Docker images before starting
- `--recreate` - Recreate containers even if config unchanged

**Example:**
```bash
# Start infrastructure
flusk infra:up

# With custom timeout
flusk infra:up --timeout 120
```

**Success Output:**
```
🐳 Starting Flusk Infrastructure

Pre-flight checks...
  ✅ Docker is running
  ✅ Ports 5432, 6379, 8080, 8001 available

Starting services...
  ✅ PostgreSQL 16 + pgvector
  ✅ Redis 7
  ✅ Adminer (DB UI)
  ✅ RedisInsight (Redis UI)

✨ Infrastructure started successfully!

Connection strings:
  DATABASE_URL=postgresql://flusk:secret@localhost:5432/flusk
  REDIS_URL=redis://localhost:6379

Manage UIs:
  Database: http://localhost:8080
  Redis:    http://localhost:8001

💡 Next: Run 'flusk migrate' to set up database schema
```

#### `flusk infra:down`

Stop Docker infrastructure services.

**Behavior:**
- Stops all containers
- Removes containers
- **Preserves data volumes** (non-destructive)

**Example:**
```bash
flusk infra:down
```

**Output:**
```
🐳 Stopping infrastructure...

✅ Stopped PostgreSQL
✅ Stopped Redis
✅ Stopped Adminer
✅ Stopped RedisInsight

✨ Infrastructure stopped successfully!

Note: Data volumes preserved. Use 'flusk infra:reset' to clear data.
```

#### `flusk infra:reset`

Reset infrastructure to clean state (deletes all data).

**Warning:** This command destroys all database and Redis data. Requires explicit confirmation.

**Behavior:**
- Prompts for confirmation
- Stops containers
- **Deletes data volumes**
- Restarts containers with fresh state

**Example:**
```bash
flusk infra:reset
```

**Interactive Flow:**
```
⚠️  This will delete ALL data in the database and Redis.

? Continue? (y/N) y

🐳 Resetting infrastructure...

✅ Stopped containers
✅ Deleted volumes
✅ Restarted containers

✨ Infrastructure reset complete!
```

#### `flusk infra:logs [service]`

View logs from infrastructure services.

**Arguments:**
- `service` (optional) - Service name (postgres | redis | adminer | redisinsight)

**Options:**
- `--follow, -f` - Follow log output (default: true)
- `--tail <n>` - Number of lines to show (default: 100)

**Example:**
```bash
# View all logs
flusk infra:logs

# View specific service
flusk infra:logs postgres

# View last 50 lines without following
flusk infra:logs --tail 50 --no-follow
```

### Code Generation

#### `flusk g [entity-file]`

Generate all code layers from entity schema.

**Arguments:**
- `entity-file` - Entity filename (e.g., `llm-call.entity.ts`)

**Options:**
- `--types-only` - Generate only types package (skip resources, business-logic, execution)
- `--all` - Generate from all entities in `packages/entities/src/`
- `--dry-run` - Preview changes without writing files
- `--force` - Overwrite manually modified files
- `--verbose, -v` - Show detailed output

**Examples:**
```bash
# Single entity - all layers
flusk g llm-call.entity.ts

# Single entity - types only
flusk g llm-call.entity.ts --types-only

# All entities
flusk g --all

# Preview changes
flusk g user.entity.ts --dry-run
```

**Output:**
```
🔧 Generating code from user.entity.ts

Analyzing entity schema...
  ✅ Entity: User
  ✅ Fields: 3 (id, email, createdAt)
  ✅ Relations: 0

Generating files...
  ✅ packages/types/src/user.types.ts (287 bytes)
  ✅ packages/resources/src/repositories/user.repository.ts (1.2 KB)
  ✅ packages/business-logic/src/validators/validate-user.ts (456 bytes)
  ✅ packages/execution/src/routes/user.routes.ts (892 bytes)

✨ Generation complete! (4 files, 2.8 KB total)

💡 Next: Run 'flusk migrate' to update database
```

### Database Migrations

#### `flusk migrate`

Run all pending SQL migrations in order.

**Requirements:**
- `DATABASE_URL` environment variable must be set
- PostgreSQL database must be running

**Example:**
```bash
flusk migrate
```

**Output:**
```
🗄️  Running database migrations...

✅ 001_create_llm_calls.sql
✅ 002_create_patterns.sql
✅ 003_create_conversions.sql

✨ Migrations complete! (3 applied)
```

## What Gets Generated

When you run `flusk g entity-name.entity.ts`, the CLI creates:

### Types Package (`packages/types/`)
- `entity-name.types.ts` - TypeScript types and JSON schemas
  - Entity type from schema
  - Insert/Update/Query variants
  - JSON schema exports

### Resources Package (`packages/resources/`)
- `repositories/entity-name.repository.ts` - Database repository
  - `create()` - Insert new record
  - `findById()` - Find by UUID
  - `update()` - Update record
  - `closePool()` - Cleanup
- `migrations/NNN_entity-names.sql` - Database migration
  - Table creation
  - Indexes
  - Triggers

### Business Logic Package (`packages/business-logic/`)
- `entity-name/validate-entity-name.function.ts` - Validation stub
- `entity-name/index.ts` - Exports

### Execution Package (`packages/execution/`)
- `routes/entity-name.routes.ts` - REST endpoints
  - POST /entity-names
  - GET /entity-names/:id
- `plugins/entity-name.plugin.ts` - Fastify plugin
- `hooks/entity-name.hooks.ts` - Request hooks (stubs)

## Generated Code Markers

All generated files include a detailed header:

```typescript
/**
 * @generated by flusk CLI v1.0.0
 * Generated from: packages/entities/src/entity-name.entity.ts
 * DO NOT EDIT - Changes will be overwritten on regeneration
 * To regenerate: flusk g entity-name.entity.ts
 * Last generated: 2026-02-06T14:30:00Z
 */
```

This header helps:
- Identify generated files (for scripts and CI)
- Track when files were last generated
- Link back to source entity
- Prevent accidental manual edits

## Project Scripts

From the project root, you can use these npm scripts:

```bash
# Regenerate all files from entities
pnpm generate

# Check that generated files are in sync
pnpm generate:check

# Verify what would be generated (dry run)
pnpm generate:verify
```

These scripts use:
- `scripts/regenerate-all.ts` - Reads `.fluskrc.json` and regenerates all entities
- `scripts/check-generated.ts` - Validates @generated files haven't been manually edited

## Workflow

### Initial Project Setup

1. **Initialize project**
   ```bash
   flusk init my-api-project
   cd my-api-project
   ```

2. **Configure environment**
   ```bash
   flusk env:setup
   # Or manually: cp .env.example .env
   ```

3. **Start infrastructure**
   ```bash
   flusk infra:up
   ```

4. **Verify setup**
   ```bash
   flusk env:validate
   ```

### Development Workflow

1. **Define entity schema** in `packages/entities/src/`

2. **Generate code**
   ```bash
   flusk g entity-name.entity.ts
   ```

3. **Run migrations**
   ```bash
   flusk migrate
   ```

4. **Customize business logic** (in `packages/business-logic/`)

5. **Test** your changes

6. **Commit** to version control

**Important**: Never manually edit generated files! Changes will be lost on regeneration.

## Architecture

The CLI follows Flusk's architecture principles:

- **Schema-first** - TypeBox schemas drive all code generation
- **Composable monolith** - Generates plugin-based isolation
- **Pure business logic** - Function stubs have no side effects
- **Resources = I/O only** - Repositories isolated from business logic

## Error Handling

### Common Errors

**Docker not found:**
```
❌ Error: Docker not found
Please install Docker: https://docs.docker.com/get-docker/
```

**Port conflict:**
```
❌ Error: Port 5432 already in use
Stop conflicting service or modify docker-compose.yml
```

**Missing .env:**
```
⚠️  Warning: .env file not found
Run 'flusk env:setup' to create environment configuration
```

**Invalid entity schema:**
```
❌ VALIDATION ERROR: Invalid entity schema

packages/entities/src/user.entity.ts
  Line 12: Missing required field 'Type'

Fix: Add import statement at the top of the file
```

## Development

```bash
# Build CLI
cd packages/cli
pnpm build

# Watch mode
pnpm dev

# Test
pnpm test

# Test specific command
node dist/bin/flusk.js --help
```

## Configuration

### `.fluskrc.json`

Optional project configuration file (root directory):

```json
{
  "entities": ["llm-call", "pattern", "conversion"],
  "database": {
    "migrationDir": "packages/resources/src/migrations"
  },
  "cli": {
    "verbosity": "normal"
  }
}
```

## Requirements

- **Node.js** 22+
- **Docker** 24+ (for infrastructure commands)
- **PostgreSQL** 16+ with pgvector extension
- **Redis** 7+
- **pnpm** 8+

## Help & Troubleshooting

```bash
# Get help
flusk --help
flusk <command> --help

# Check version
flusk --version

# Validate environment
flusk env:validate

# View infrastructure logs
flusk infra:logs
```

For detailed usage guides and examples, see:
- [USAGE.md](./USAGE.md) - Comprehensive usage guide
- [EXAMPLES.md](./EXAMPLES.md) - Real-world examples
- [../../docs/CLI_ENHANCEMENT_PLAN.md](../../docs/CLI_ENHANCEMENT_PLAN.md) - Feature roadmap

## License

MIT
