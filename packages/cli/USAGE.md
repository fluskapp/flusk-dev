# Flusk CLI Usage Guide

Comprehensive usage guide for the Flusk CLI, covering project initialization, infrastructure management, code generation, and database migrations.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Initialization](#project-initialization)
- [Environment Management](#environment-management)
- [Infrastructure Management](#infrastructure-management)
- [Code Generation](#code-generation)
- [Database Migrations](#database-migrations)
- [Workflows](#workflows)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

### New Project Setup (< 2 minutes)

```bash
# 1. Initialize project
flusk init my-api-project
cd my-api-project

# 2. Setup environment
flusk env:setup

# 3. Start infrastructure
flusk infra:up

# 4. You're ready to build!
flusk create:entity  # (coming in Phase 2)
```

### Existing Project Setup

```bash
# 1. Clone repository
git clone <repo-url>
cd <project>

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp .env.example .env
# OR use interactive setup:
flusk env:setup

# 4. Start infrastructure
flusk infra:up

# 5. Run migrations
flusk migrate
```

---

## Project Initialization

### `flusk init [project-name]`

Creates a new Flusk project with complete infrastructure and configuration.

#### Basic Usage

```bash
# Create project in new directory
flusk init my-api-project

# Create project in current directory
flusk init .
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--force` | Overwrite existing files without confirmation | false |
| `--no-install` | Skip dependency installation | false |
| `--template <name>` | Use project template (basic, advanced) | basic |

#### Examples

```bash
# Standard initialization
flusk init my-project

# Force overwrite existing directory
flusk init my-project --force

# Skip dependency installation (faster, install later)
flusk init my-project --no-install

# Use advanced template with examples
flusk init my-project --template advanced
```

#### What Gets Created

**Directory Structure:**
```
my-api-project/
├── packages/
│   ├── entities/        # Entity schemas (SOURCE OF TRUTH)
│   │   └── src/
│   │       └── base.entity.ts
│   ├── types/           # Generated TypeScript types
│   │   └── src/
│   ├── resources/       # DB repositories, API clients
│   │   └── src/
│   │       ├── repositories/
│   │       └── migrations/
│   ├── business-logic/  # Pure functions
│   │   └── src/
│   ├── execution/       # Routes, plugins, hooks
│   │   └── src/
│   │       ├── routes/
│   │       ├── plugins/
│   │       └── hooks/
│   ├── sdk/             # Customer SDKs
│   │   └── src/
│   └── cli/             # CLI tools
│       └── src/
├── .gitignore           # Node.js + TypeScript patterns
├── docker-compose.yml   # PostgreSQL 16 + Redis 7
├── .env.example         # Environment template
├── watt.json            # Platformatic Watt config
├── package.json         # Workspace configuration
├── tsconfig.json        # TypeScript configuration
└── README.md            # Project README
```

**Generated Files:**

1. **`.gitignore`** - Comprehensive Node.js/TypeScript patterns
   - `node_modules/`, `dist/`, `*.log`
   - `.env`, `.env.local`
   - IDE files (`.vscode/`, `.idea/`)
   - OS files (`.DS_Store`, `Thumbs.db`)

2. **`docker-compose.yml`** - Infrastructure services
   - PostgreSQL 16 with pgvector extension
   - Redis 7 with persistence
   - Adminer (database UI)
   - RedisInsight (Redis UI)
   - Health checks configured
   - Named volumes for data persistence

3. **`.env.example`** - Environment template
   ```
   DATABASE_URL=postgresql://flusk:secret@localhost:5432/flusk
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=<generate-with-flusk-env-setup>
   PORT=3000
   NODE_ENV=development
   LOG_LEVEL=info
   ```

4. **`watt.json`** - Platformatic Watt configuration
   - Service definitions
   - Database connections
   - Plugin configuration

5. **`package.json`** - Workspace setup
   - pnpm workspaces configured
   - Core dependencies included
   - Development scripts ready

#### Post-Initialization Steps

After running `flusk init`, the CLI displays next steps:

```
✨ Project created successfully!

Next steps:
  1. cd my-api-project
  2. flusk env:setup
  3. flusk infra:up
  4. flusk create:entity
```

#### Success Criteria

✅ Project initializes in < 2 minutes
✅ All required files created
✅ Dependencies installed (unless --no-install)
✅ Ready to start infrastructure immediately

---

## Environment Management

### `flusk env:setup`

Interactively create `.env` file from `.env.example` template.

#### Basic Usage

```bash
# Interactive setup (recommended)
flusk env:setup

# Non-interactive with defaults (CI/CD)
flusk env:setup --yes
```

#### Interactive Flow

```
? DATABASE_URL: (postgresql://flusk:secret@localhost:5432/flusk)
  Press Enter to use default, or type custom value

? REDIS_URL: (redis://localhost:6379)
  Press Enter to use default

? PORT: (3000)
  Port for API server

? NODE_ENV: (Use arrow keys)
❯ development
  production
  test

✅ Generating JWT_SECRET (auto-generated)
   Generated: 7f3a9b2c8d1e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9

✅ Created .env file

💡 Run 'flusk env:validate' to verify configuration
```

#### Environment Variables

| Variable | Required | Format | Example |
|----------|----------|--------|---------|
| `DATABASE_URL` | Yes | PostgreSQL URL | `postgresql://user:pass@host:5432/db` |
| `REDIS_URL` | Yes | Redis URL | `redis://localhost:6379` |
| `JWT_SECRET` | Yes | 32+ characters | Auto-generated |
| `PORT` | Yes | 1-65535 | `3000` |
| `NODE_ENV` | Yes | development\|production\|test | `development` |
| `LOG_LEVEL` | No | error\|warn\|info\|debug | `info` |

#### Auto-Generated Values

- **JWT_SECRET**: 64-character hex string (crypto.randomBytes(32))
- Cryptographically secure
- Unique per project

#### Examples

```bash
# Interactive setup
flusk env:setup

# Use all defaults (non-interactive)
flusk env:setup --yes

# Setup with verbose output
flusk env:setup --verbose
```

#### Overwrite Protection

If `.env` already exists:
```
⚠️  .env file already exists

? Overwrite existing .env? (y/N) n

Cancelled. Existing .env preserved.
```

---

### `flusk env:validate`

Validate environment configuration against requirements.

#### Basic Usage

```bash
# Validate .env file
flusk env:validate

# Validate custom env file
flusk env:validate --file .env.production
```

#### Validation Rules

**DATABASE_URL:**
- ✅ Format: `postgresql://[user[:password]@]host[:port]/database`
- ✅ Host can be IP or domain
- ✅ Port defaults to 5432 if omitted

**REDIS_URL:**
- ✅ Format: `redis://[host][:port]`
- ✅ Port defaults to 6379 if omitted

**JWT_SECRET:**
- ✅ Minimum 32 characters
- ✅ Recommended: 64+ characters

**PORT:**
- ✅ Integer between 1-65535
- ⚠️  Warning if < 1024 (requires root on Linux)
- ⚠️  Warning if conflicts with infrastructure (5432, 6379, 8080, 8001)

**NODE_ENV:**
- ✅ Must be: `development`, `production`, or `test`

#### Success Output

```
🔍 Validating environment variables...

✅ DATABASE_URL (valid PostgreSQL URL)
✅ REDIS_URL (valid Redis URL)
✅ JWT_SECRET (64 characters)
✅ PORT (3000, valid range)
✅ NODE_ENV (development)

All environment variables valid!

[Exit code: 0]
```

#### Error Output

```
🔍 Validating environment variables...

✅ DATABASE_URL (valid PostgreSQL URL)
❌ REDIS_URL (missing)
❌ JWT_SECRET (too short: 16 characters, minimum 32 required)
⚠️  PORT (80, requires root privileges)

Validation failed. Fix 2 errors, 1 warning.

Errors:
  • REDIS_URL: Add to .env file (example: redis://localhost:6379)
  • JWT_SECRET: Generate new secret (run: flusk env:setup)

Warnings:
  • PORT: Port 80 may require root/sudo on Linux

[Exit code: 1]
```

#### Use Cases

**Before deployment:**
```bash
flusk env:validate --file .env.production
```

**CI/CD pipelines:**
```bash
flusk env:validate || exit 1
```

**Development workflow:**
```bash
flusk env:validate && flusk infra:up
```

---

## Infrastructure Management

### `flusk infra:up`

Start Docker infrastructure services.

#### Basic Usage

```bash
# Start all services
flusk infra:up

# Start with custom timeout
flusk infra:up --timeout 120

# Pull latest images before starting
flusk infra:up --pull
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--timeout <seconds>` | Health check timeout | 60 |
| `--pull` | Pull latest Docker images | false |
| `--recreate` | Recreate containers | false |
| `--no-health-check` | Skip health checks | false |

#### Pre-flight Checks

Before starting services, the CLI validates:

```
Pre-flight checks...
  ✅ Docker is installed (version 24.0.0)
  ✅ Docker daemon is running
  ✅ docker-compose.yml exists
  ✅ Port 5432 available (PostgreSQL)
  ✅ Port 6379 available (Redis)
  ✅ Port 8080 available (Adminer)
  ✅ Port 8001 available (RedisInsight)
```

#### Services Started

**PostgreSQL 16 + pgvector** (port 5432)
- Vector similarity search extension
- Persistent volume: `flusk_postgres_data`
- Health check: `pg_isready`
- Default credentials: `flusk:secret`

**Redis 7** (port 6379)
- Persistence enabled (AOF + RDB)
- Persistent volume: `flusk_redis_data`
- Health check: `redis-cli ping`

**Adminer** (port 8080)
- Database management UI
- Access: http://localhost:8080
- Server: `postgres` (Docker network)

**RedisInsight** (port 8001)
- Redis management UI
- Access: http://localhost:8001
- Auto-discovers local Redis

#### Success Output

```
🐳 Starting Flusk Infrastructure

Pre-flight checks...
  ✅ Docker is running
  ✅ Ports 5432, 6379, 8080, 8001 available

Starting services...
  PostgreSQL 16 + pgvector
    ⠋ Pulling image (if needed)
    ⠋ Starting container
    ⠋ Waiting for ready state (0/60s)
    ✅ Ready on localhost:5432

  Redis 7
    ✅ Ready on localhost:6379

  Adminer (DB UI)
    ✅ Ready on http://localhost:8080

  RedisInsight (Redis UI)
    ✅ Ready on http://localhost:8001

✨ Infrastructure started successfully! (startup time: 8.2s)

Connection strings:
  DATABASE_URL=postgresql://flusk:secret@localhost:5432/flusk
  REDIS_URL=redis://localhost:6379

Manage UIs:
  Database: http://localhost:8080
  Redis:    http://localhost:8001

💡 Next: Run 'flusk migrate' to set up database schema
```

#### Error Handling

**Docker not installed:**
```
❌ ERROR: Docker not found

Docker is required to run infrastructure services.

Solution:
  Install Docker Desktop: https://docs.docker.com/get-docker/

After installation, restart your terminal and try again.

[Exit code: 1]
```

**Docker daemon not running:**
```
❌ ERROR: Docker daemon not running

Could not connect to Docker daemon.

Solution:
  Start Docker Desktop application

On Linux:
  sudo systemctl start docker

[Exit code: 1]
```

**Port conflict:**
```
❌ ERROR: Port 5432 already in use

Another service is using port 5432 (PostgreSQL default port).

Conflicting process:
  PID 1234: postgres

Solutions:
  1. Stop conflicting service:
     sudo lsof -ti:5432 | xargs kill

  2. Modify docker-compose.yml:
     Change "5432:5432" to "5433:5432"
     Then use: DATABASE_URL=postgresql://flusk:secret@localhost:5433/flusk

[Exit code: 1]
```

**Health check timeout:**
```
⚠️  WARNING: PostgreSQL health check timeout (60s exceeded)

Container started but not responding to health checks.

Troubleshooting:
  1. Check logs:
     flusk infra:logs postgres

  2. Verify container status:
     docker ps

  3. Try manual connection:
     psql postgresql://flusk:secret@localhost:5432/flusk

  4. Increase timeout:
     flusk infra:up --timeout 120

[Exit code: 1]
```

---

### `flusk infra:down`

Stop Docker infrastructure services.

#### Basic Usage

```bash
# Stop all services
flusk infra:down

# Stop and remove volumes (WARNING: data loss)
flusk infra:down --volumes
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--volumes, -v` | Remove volumes (⚠️  deletes data) | false |
| `--remove-orphans` | Remove orphaned containers | true |

#### Behavior

**Default (Safe):**
- Stops containers
- Removes containers
- **Preserves data volumes** ✅
- Can restart with `flusk infra:up` without data loss

**With `--volumes` (Destructive):**
- Stops containers
- Removes containers
- **Deletes data volumes** ⚠️
- Fresh state on next `flusk infra:up`

#### Examples

```bash
# Safe shutdown (preserves data)
flusk infra:down

# Complete cleanup (deletes data)
flusk infra:down --volumes
```

#### Output

```
🐳 Stopping infrastructure...

  ✅ Stopped PostgreSQL
  ✅ Stopped Redis
  ✅ Stopped Adminer
  ✅ Stopped RedisInsight

✨ Infrastructure stopped successfully!

Note: Data volumes preserved.
      Use 'flusk infra:reset' to clear all data.
```

---

### `flusk infra:reset`

Reset infrastructure to clean state.

**⚠️  WARNING: This command destroys ALL database and Redis data.**

#### Basic Usage

```bash
# Interactive reset (requires confirmation)
flusk infra:reset

# Force reset without confirmation (⚠️  dangerous)
flusk infra:reset --yes
```

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--yes, -y` | Skip confirmation prompt | false |
| `--no-restart` | Don't restart after reset | false |

#### Interactive Flow

```
⚠️  This will delete ALL data in the database and Redis.

  • All database tables and records
  • All Redis keys and data
  • Cannot be undone

? Continue? (y/N) y

🐳 Resetting infrastructure...

  ✅ Stopped containers
  ✅ Deleted volumes
      - flusk_postgres_data (1.2 GB)
      - flusk_redis_data (45 MB)
  ✅ Restarted containers
  ✅ PostgreSQL ready
  ✅ Redis ready

✨ Infrastructure reset complete!

💡 Next: Run 'flusk migrate' to recreate database schema
```

#### Use Cases

**Start fresh for testing:**
```bash
flusk infra:reset && flusk migrate
```

**Clear corrupted data:**
```bash
flusk infra:reset
```

**CI/CD clean environment:**
```bash
flusk infra:reset --yes
```

---

### `flusk infra:logs [service]`

View logs from infrastructure services.

#### Basic Usage

```bash
# View all logs (follow mode)
flusk infra:logs

# View specific service
flusk infra:logs postgres

# View without following
flusk infra:logs --no-follow

# Last 50 lines only
flusk infra:logs --tail 50
```

#### Arguments

| Argument | Description | Options |
|----------|-------------|---------|
| `service` | Service name (optional) | postgres, redis, adminer, redisinsight |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--follow, -f` | Follow log output | true |
| `--tail <n>` | Number of lines to show | 100 |
| `--timestamps` | Show timestamps | false |
| `--since <time>` | Show logs since timestamp | (all) |

#### Examples

```bash
# Follow all logs in real-time
flusk infra:logs

# View PostgreSQL logs only
flusk infra:logs postgres

# Last 50 lines without following
flusk infra:logs postgres --tail 50 --no-follow

# Logs from last 10 minutes
flusk infra:logs --since 10m

# With timestamps
flusk infra:logs postgres --timestamps
```

#### Sample Output

```
🐳 Infrastructure Logs

PostgreSQL:
  2026-02-06 14:30:15 | LOG: database system is ready to accept connections
  2026-02-06 14:30:16 | LOG: autovacuum launcher started

Redis:
  2026-02-06 14:30:15 | * Ready to accept connections
  2026-02-06 14:30:16 | * DB loaded from disk: 0.001 seconds

Press Ctrl+C to exit
```

#### Keyboard Controls

- `Ctrl+C` - Exit log viewer
- `Ctrl+S` - Pause scrolling
- `Ctrl+Q` - Resume scrolling

---

## Code Generation

### `flusk g [entity-file]`

Generate code layers from entity schema.

#### Basic Usage

```bash
# Generate from single entity
flusk g user.entity.ts

# Generate from all entities
flusk g --all

# Generate types only
flusk g user.entity.ts --types-only
```

#### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `entity-file` | Entity filename | Yes (unless --all) |

#### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--all` | Generate from all entities | false |
| `--types-only` | Generate only types package | false |
| `--dry-run` | Preview without writing files | false |
| `--force` | Overwrite modified files | false |
| `--verbose, -v` | Show detailed output | false |

#### Generated Files

For entity `user.entity.ts`, generates:

**Types Package** (`packages/types/src/`)
- `user.types.ts` - TypeScript interfaces + JSON schemas
  - `UserEntity` type
  - `UserInsert` type (excludes id, timestamps)
  - `UserUpdate` type (partial with id required)
  - `UserQuery` type (all optional)
  - JSON schemas for validation

**Resources Package** (`packages/resources/src/`)
- `repositories/user.repository.ts` - Database repository
  - `create(data: UserInsert): Promise<UserEntity>`
  - `findById(id: string): Promise<UserEntity | null>`
  - `update(id: string, data: UserUpdate): Promise<UserEntity>`
  - `closePool(): Promise<void>`
- `migrations/NNN_users.sql` - Database migration
  - CREATE TABLE with all fields
  - Indexes on id, email, etc.
  - Triggers for updated_at

**Business Logic Package** (`packages/business-logic/src/`)
- `user/validate-user.function.ts` - Validation stub
- `user/index.ts` - Exports

**Execution Package** (`packages/execution/src/`)
- `routes/user.routes.ts` - Fastify routes
  - POST /users - Create user
  - GET /users/:id - Get user by ID
- `plugins/user.plugin.ts` - Fastify plugin wrapper
- `hooks/user.hooks.ts` - Request/response hooks (stubs)

#### Examples

```bash
# Single entity - full generation
flusk g user.entity.ts

# Preview changes
flusk g user.entity.ts --dry-run

# Force overwrite (⚠️  overwrites manual changes)
flusk g user.entity.ts --force

# All entities
flusk g --all

# Types only (faster, for type checking)
flusk g user.entity.ts --types-only

# Verbose output (debugging)
flusk g user.entity.ts --verbose
```

#### Success Output

```
🔧 Generating code from user.entity.ts

Analyzing entity schema...
  ✅ Entity: User
  ✅ Fields: 4 (id, email, name, createdAt)
  ✅ Relations: 0
  ✅ Validation: All fields valid

Generation plan:
  → types/user.types.ts (TypeScript interfaces)
  → resources/user.repository.ts (Database repository)
  → resources/migrations/001_users.sql (Database migration)
  → business-logic/user/validate-user.ts (Validation functions)
  → execution/routes/user.routes.ts (Fastify routes)
  → execution/plugins/user.plugin.ts (Fastify plugin)
  → execution/hooks/user.hooks.ts (Request hooks)

Generating files...
  ✅ packages/types/src/user.types.ts (387 bytes)
  ✅ packages/resources/src/repositories/user.repository.ts (1.4 KB)
  ✅ packages/resources/src/migrations/001_users.sql (892 bytes)
  ✅ packages/business-logic/src/user/validate-user.ts (523 bytes)
  ✅ packages/execution/src/routes/user.routes.ts (1.1 KB)
  ✅ packages/execution/src/plugins/user.plugin.ts (456 bytes)
  ✅ packages/execution/src/hooks/user.hooks.ts (321 bytes)

✨ Generation complete! (7 files, 5.1 KB total)

📦 Generated files:
packages/
  ├─ types/src/user.types.ts
  ├─ resources/src/repositories/user.repository.ts
  ├─ resources/src/migrations/001_users.sql
  ├─ business-logic/src/user/validate-user.ts
  └─ execution/src/
      ├─ routes/user.routes.ts
      ├─ plugins/user.plugin.ts
      └─ hooks/user.hooks.ts

💡 Next steps:
  flusk migrate                    # Apply database migration
  flusk g:test user.repository.ts  # Generate tests (Phase 2)
```

---

## Database Migrations

### `flusk migrate`

Run all pending SQL migrations in order.

#### Basic Usage

```bash
# Run all pending migrations
flusk migrate

# Dry run (show what would be applied)
flusk migrate --dry-run

# Rollback last migration
flusk migrate:rollback
```

#### Requirements

**Environment:**
- `DATABASE_URL` must be set in `.env`
- PostgreSQL database must be running
- Database must be accessible

**Pre-checks:**
```
🗄️  Preparing migrations...

  ✅ DATABASE_URL configured
  ✅ Database connection successful
  ✅ Migrations directory exists
  ✅ Migrations table ready
```

#### Migration Tracking

Flusk tracks applied migrations in `_flusk_migrations` table:

```sql
CREATE TABLE _flusk_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT NOW()
);
```

#### Examples

```bash
# Run migrations
flusk migrate

# Preview migrations
flusk migrate --dry-run

# Verbose output
flusk migrate --verbose
```

#### Success Output

```
🗄️  Running database migrations...

Found 3 pending migrations:
  [001] 001_create_users.sql
  [002] 002_create_llm_calls.sql
  [003] 003_create_patterns.sql

Applying migrations...
  ✅ 001_create_users.sql (executed in 45ms)
      - Created table: users
      - Created index: idx_users_email
      - Created trigger: update_users_updated_at

  ✅ 002_create_llm_calls.sql (executed in 78ms)
      - Created table: llm_calls
      - Created index: idx_llm_calls_hash
      - Created trigger: update_llm_calls_updated_at

  ✅ 003_create_patterns.sql (executed in 52ms)
      - Created table: patterns
      - Created index: idx_patterns_signature

✨ Migrations complete! (3 applied, 175ms total)

💡 Next: Restart application to load new schema
```

---

## Workflows

### Complete Project Setup Workflow

```bash
# 1. Initialize project
flusk init my-api-project
cd my-api-project

# 2. Setup environment
flusk env:setup

# 3. Validate environment
flusk env:validate

# 4. Start infrastructure
flusk infra:up

# 5. Run migrations (if any)
flusk migrate

# 6. Start development
pnpm dev
```

### Entity Development Workflow

```bash
# 1. Create entity schema
# Edit: packages/entities/src/user.entity.ts

# 2. Generate code
flusk g user.entity.ts

# 3. Review generated files
# Check: packages/types, resources, business-logic, execution

# 4. Run migration
flusk migrate

# 5. Test endpoints
curl http://localhost:3000/users

# 6. Customize business logic
# Edit: packages/business-logic/src/user/validate-user.ts

# 7. Commit changes
git add .
git commit -m "Add user entity"
```

### Daily Development Workflow

```bash
# Morning: Start infrastructure
flusk infra:up

# Work on features
flusk g new-entity.entity.ts
flusk migrate

# Debugging: View logs
flusk infra:logs postgres

# Evening: Stop infrastructure
flusk infra:down
```

### CI/CD Workflow

```bash
# CI Pipeline
flusk init . --yes --no-install
flusk env:validate --file .env.test || exit 1
flusk infra:up --no-health-check
flusk migrate --yes
pnpm test

# Cleanup
flusk infra:down --volumes
```

---

## Troubleshooting

### Common Issues

#### Issue: "Docker not found"

**Symptoms:**
```
❌ ERROR: Docker not found
```

**Solutions:**
1. Install Docker Desktop: https://docs.docker.com/get-docker/
2. Restart terminal after installation
3. Verify: `docker --version`

---

#### Issue: "Port already in use"

**Symptoms:**
```
❌ ERROR: Port 5432 already in use
```

**Solutions:**

**Option 1: Stop conflicting service**
```bash
# Find process using port
lsof -ti:5432

# Kill process
sudo lsof -ti:5432 | xargs kill
```

**Option 2: Use different port**
```yaml
# Edit docker-compose.yml
services:
  postgres:
    ports:
      - "5433:5432"  # Use 5433 instead
```

```bash
# Update DATABASE_URL
DATABASE_URL=postgresql://flusk:secret@localhost:5433/flusk
```

---

#### Issue: "Health check timeout"

**Symptoms:**
```
⚠️  PostgreSQL health check timeout (60s exceeded)
```

**Solutions:**

**1. Check logs:**
```bash
flusk infra:logs postgres
```

**2. Increase timeout:**
```bash
flusk infra:up --timeout 120
```

**3. Verify Docker resources:**
- Increase Docker Desktop memory (4GB+ recommended)
- Check disk space (10GB+ free recommended)

---

#### Issue: "Migration failed"

**Symptoms:**
```
❌ Migration failed: 001_create_users.sql
```

**Solutions:**

**1. Check database connection:**
```bash
flusk env:validate
```

**2. View migration content:**
```bash
cat packages/resources/src/migrations/001_create_users.sql
```

**3. Manual migration:**
```bash
psql $DATABASE_URL < packages/resources/src/migrations/001_create_users.sql
```

**4. Reset and retry:**
```bash
flusk infra:reset
flusk migrate
```

---

#### Issue: "Generated files not updating"

**Symptoms:**
- Changes to entity schema not reflected in generated code

**Solutions:**

**1. Force regeneration:**
```bash
flusk g user.entity.ts --force
```

**2. Clean build:**
```bash
rm -rf packages/*/dist
pnpm build
```

**3. Check for manual edits:**
```bash
# Files with @generated header should not be edited
grep -r "@generated" packages/
```

---

### Debug Mode

Enable verbose output for all commands:

```bash
# Set environment variable
export FLUSK_DEBUG=true

# Or use --verbose flag
flusk infra:up --verbose
```

### Getting Help

```bash
# General help
flusk --help

# Command-specific help
flusk init --help
flusk infra:up --help

# Check version
flusk --version
```

---

For more examples and use cases, see:
- [EXAMPLES.md](./EXAMPLES.md) - Real-world examples
- [README.md](./README.md) - Command reference
- [../../docs/CLI_ENHANCEMENT_PLAN.md](../../docs/CLI_ENHANCEMENT_PLAN.md) - Feature roadmap
