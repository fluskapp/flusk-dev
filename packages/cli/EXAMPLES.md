# Flusk CLI Examples

Real-world examples demonstrating common workflows and use cases for the Flusk CLI.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Setup Examples](#project-setup-examples)
- [Development Workflows](#development-workflows)
- [Infrastructure Management](#infrastructure-management)
- [Code Generation Patterns](#code-generation-patterns)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting Scenarios](#troubleshooting-scenarios)

---

## Getting Started

### Example 1: Complete New Project Setup

**Scenario**: Starting a brand new Flusk project from scratch.

```bash
# 1. Initialize project
$ flusk init my-saas-api
🚀 Initializing Flusk project: my-saas-api

✅ Created project structure
✅ Generated .gitignore
✅ Generated docker-compose.yml
✅ Generated .env.example
✅ Generated watt.json
✅ Generated package.json
✅ Installed dependencies (14.2s)

✨ Project created successfully!

Next steps:
  1. cd my-saas-api
  2. flusk env:setup
  3. flusk infra:up
  4. flusk create:entity

# 2. Navigate to project
$ cd my-saas-api

# 3. Setup environment (interactive)
$ flusk env:setup
? DATABASE_URL: (postgresql://flusk:secret@localhost:5432/flusk)
  [Press Enter to use default]
? REDIS_URL: (redis://localhost:6379)
? PORT: (3000)
? NODE_ENV: development

✅ Generating JWT_SECRET (auto-generated)
   Generated: 7f3a9b2c8d1e4f5a6b7c8d9e0f1a2b3c...

✅ Created .env file

# 4. Validate configuration
$ flusk env:validate
🔍 Validating environment variables...

✅ DATABASE_URL (valid PostgreSQL URL)
✅ REDIS_URL (valid Redis URL)
✅ JWT_SECRET (64 characters)
✅ PORT (3000, valid range)
✅ NODE_ENV (development)

All environment variables valid!

# 5. Start infrastructure
$ flusk infra:up
🐳 Starting Flusk Infrastructure

Pre-flight checks...
  ✅ Docker is running
  ✅ Ports 5432, 6379, 8080, 8001 available

Starting services...
  ✅ PostgreSQL 16 + pgvector ready on localhost:5432
  ✅ Redis 7 ready on localhost:6379
  ✅ Adminer ready on http://localhost:8080
  ✅ RedisInsight ready on http://localhost:8001

✨ Infrastructure started successfully! (startup time: 7.8s)

Connection strings:
  DATABASE_URL=postgresql://flusk:secret@localhost:5432/flusk
  REDIS_URL=redis://localhost:6379

# 6. You're ready to develop!
$ pnpm dev
```

**Time**: ~2 minutes total

---

### Example 2: Clone and Setup Existing Project

**Scenario**: Setting up a project that already exists in version control.

```bash
# 1. Clone repository
$ git clone https://github.com/your-org/flusk-api.git
$ cd flusk-api

# 2. Install dependencies
$ pnpm install

# 3. Setup environment (use interactive setup)
$ flusk env:setup
# ... follow prompts ...
✅ Created .env file

# 4. Validate environment
$ flusk env:validate
✅ All environment variables valid!

# 5. Start infrastructure
$ flusk infra:up
✨ Infrastructure started successfully!

# 6. Run existing migrations
$ flusk migrate
🗄️  Running database migrations...
✅ 001_create_users.sql
✅ 002_create_llm_calls.sql
✅ 003_create_patterns.sql
✨ Migrations complete! (3 applied)

# 7. Start development server
$ pnpm dev
```

**Time**: ~3 minutes (including git clone)

---

## Project Setup Examples

### Example 3: Project with Custom Configuration

**Scenario**: Initialize project with specific settings for a production environment.

```bash
# Initialize with custom database port
$ flusk init production-api

# Edit docker-compose.yml to use custom ports
$ nano docker-compose.yml
# Change PostgreSQL: "5433:5432"
# Change Redis: "6380:6379"

# Setup environment with custom URLs
$ flusk env:setup
? DATABASE_URL: postgresql://produser:prodpass@localhost:5433/proddb
? REDIS_URL: redis://localhost:6380
? PORT: 8080
? NODE_ENV: production

✅ Created .env file

# Validate custom configuration
$ flusk env:validate
✅ All environment variables valid!

# Start with custom ports
$ flusk infra:up
✨ Infrastructure started successfully!
  PostgreSQL on localhost:5433
  Redis on localhost:6380
```

---

### Example 4: Multiple Environments

**Scenario**: Managing development, staging, and production configurations.

```bash
# Create environment-specific configs
$ flusk env:setup
# Save as .env.development

$ flusk env:setup
# Edit values for staging
# Save as .env.staging

$ flusk env:setup
# Edit values for production
# Save as .env.production

# Validate each environment
$ flusk env:validate --file .env.development
✅ All environment variables valid!

$ flusk env:validate --file .env.staging
✅ All environment variables valid!

$ flusk env:validate --file .env.production
✅ All environment variables valid!

# Use specific environment
$ cp .env.development .env
$ flusk infra:up
# Development infrastructure running

# Switch to staging
$ cp .env.staging .env
$ flusk infra:reset --yes
$ flusk infra:up
# Staging infrastructure running
```

---

## Development Workflows

### Example 5: Creating a New Entity

**Scenario**: Adding a `User` entity to the system.

```bash
# 1. Create entity schema
$ cat > packages/entities/src/user.entity.ts <<'EOF'
import { Type } from '@sinclair/typebox';

export const UserEntity = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ format: 'email' }),
  name: Type.String({ minLength: 1, maxLength: 255 }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});
EOF

# 2. Generate code
$ flusk g user.entity.ts
🔧 Generating code from user.entity.ts

Analyzing entity schema...
  ✅ Entity: User
  ✅ Fields: 5 (id, email, name, createdAt, updatedAt)
  ✅ Relations: 0

Generating files...
  ✅ packages/types/src/user.types.ts (421 bytes)
  ✅ packages/resources/src/repositories/user.repository.ts (1.5 KB)
  ✅ packages/resources/src/migrations/001_users.sql (978 bytes)
  ✅ packages/business-logic/src/user/validate-user.ts (589 bytes)
  ✅ packages/execution/src/routes/user.routes.ts (1.2 KB)
  ✅ packages/execution/src/plugins/user.plugin.ts (467 bytes)
  ✅ packages/execution/src/hooks/user.hooks.ts (334 bytes)

✨ Generation complete! (7 files, 5.5 KB total)

# 3. Review generated migration
$ cat packages/resources/src/migrations/001_users.sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
...

# 4. Apply migration
$ flusk migrate
🗄️  Running database migrations...
  ✅ 001_users.sql (executed in 42ms)
      - Created table: users
      - Created index: idx_users_email
      - Created trigger: update_users_updated_at

✨ Migrations complete! (1 applied)

# 5. Test endpoint
$ curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "name": "John Doe"}'

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2026-02-06T14:30:00Z",
  "updatedAt": "2026-02-06T14:30:00Z"
}

# 6. Commit changes
$ git add packages/entities/src/user.entity.ts
$ git add packages/types/src/user.types.ts
$ git add packages/resources/src/
$ git add packages/business-logic/src/user/
$ git add packages/execution/src/routes/user.routes.ts
$ git commit -m "feat: add User entity with CRUD endpoints"
```

---

### Example 6: Updating an Existing Entity

**Scenario**: Adding a `phoneNumber` field to the `User` entity.

```bash
# 1. Update entity schema
$ nano packages/entities/src/user.entity.ts
# Add: phoneNumber: Type.Optional(Type.String())

# 2. Preview changes
$ flusk g user.entity.ts --dry-run
🔧 Generating code from user.entity.ts (DRY RUN)

Changes to be made:
  📝 packages/types/src/user.types.ts (modified)
      + phoneNumber?: string;
  📝 packages/resources/src/migrations/002_add_phone_to_users.sql (new)
      + ALTER TABLE users ADD COLUMN phone_number VARCHAR(255);
  ✨ No other files modified

# 3. Regenerate code
$ flusk g user.entity.ts --force
✨ Generation complete! (updated 2 files)

# 4. Apply migration
$ flusk migrate
  ✅ 002_add_phone_to_users.sql
✨ Migrations complete! (1 applied)

# 5. Test updated endpoint
$ curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email": "new@example.com", "name": "Jane Doe", "phoneNumber": "+1234567890"}'
```

---

## Infrastructure Management

### Example 7: Daily Development Routine

**Scenario**: Typical day of development.

```bash
# Morning: Start work
$ cd ~/projects/my-saas-api
$ flusk infra:up
✨ Infrastructure started successfully! (startup time: 6.1s)

$ pnpm dev
# Start developing...

# Debugging: Check database logs
$ flusk infra:logs postgres
PostgreSQL:
  2026-02-06 09:15:23 | LOG: database system is ready
  2026-02-06 09:15:45 | LOG: connection received: host=172.19.0.1
  ...
^C  # Press Ctrl+C to exit

# Lunch break: Stop infrastructure to save resources
$ flusk infra:down
✨ Infrastructure stopped successfully!

# Afternoon: Resume work
$ flusk infra:up
✨ Infrastructure started successfully! (startup time: 4.2s)

# End of day: Stop infrastructure
$ flusk infra:down
✨ Infrastructure stopped successfully!
Note: Data volumes preserved.
```

---

### Example 8: Debugging Infrastructure Issues

**Scenario**: PostgreSQL container won't start.

```bash
# Try to start infrastructure
$ flusk infra:up
❌ ERROR: PostgreSQL health check timeout (60s exceeded)

# Step 1: Check logs
$ flusk infra:logs postgres
PostgreSQL:
  2026-02-06 14:30:15 | ERROR: database files are incompatible with server
  2026-02-06 14:30:15 | HINT: The data directory was initialized by PostgreSQL version 15...

# Step 2: Data directory from old version detected
# Solution: Reset infrastructure
$ flusk infra:reset
⚠️  This will delete ALL data in the database and Redis.
? Continue? (y/N) y

🐳 Resetting infrastructure...
  ✅ Stopped containers
  ✅ Deleted volumes
  ✅ Restarted containers
  ✅ PostgreSQL ready
  ✅ Redis ready

✨ Infrastructure reset complete!

# Step 3: Re-run migrations
$ flusk migrate
✨ Migrations complete! (3 applied)

# Step 4: Verify everything works
$ curl http://localhost:3000/health
{"status": "healthy", "database": "connected", "redis": "connected"}
```

---

### Example 9: Port Conflict Resolution

**Scenario**: Port 5432 already in use.

```bash
# Try to start infrastructure
$ flusk infra:up
❌ ERROR: Port 5432 already in use

Conflicting process:
  PID 1234: postgres

Solutions:
  1. Stop conflicting service:
     sudo lsof -ti:5432 | xargs kill

  2. Modify docker-compose.yml:
     Change "5432:5432" to "5433:5432"

# Option 1: Stop existing PostgreSQL
$ sudo lsof -ti:5432 | xargs kill
$ flusk infra:up
✨ Infrastructure started successfully!

# Or Option 2: Use different port
$ nano docker-compose.yml
# Change: "5433:5432"

$ nano .env
# Change: DATABASE_URL=postgresql://flusk:secret@localhost:5433/flusk

$ flusk env:validate
✅ All environment variables valid!

$ flusk infra:up
✨ Infrastructure started successfully!
  PostgreSQL on localhost:5433
```

---

## Code Generation Patterns

### Example 10: Bulk Entity Generation

**Scenario**: Generate code for multiple entities at once.

```bash
# Create multiple entity schemas
$ ls packages/entities/src/
base.entity.ts
user.entity.ts
product.entity.ts
order.entity.ts

# Generate all at once
$ flusk g --all
🔧 Generating code from 3 entity files...

📦 Processing: user.entity.ts
  ✅ 7 files generated

📦 Processing: product.entity.ts
  ✅ 7 files generated

📦 Processing: order.entity.ts
  ✅ 7 files generated

✨ Generation complete! (21 files total, 15.3 KB)

# Run all migrations
$ flusk migrate
  ✅ 001_users.sql
  ✅ 002_products.sql
  ✅ 003_orders.sql
✨ Migrations complete! (3 applied)
```

---

### Example 11: Types-Only Generation for Type Checking

**Scenario**: Update types without regenerating database layer.

```bash
# Made changes to entity schema, just need types
$ flusk g user.entity.ts --types-only
🔧 Generating code from user.entity.ts

Generating files...
  ✅ packages/types/src/user.types.ts (432 bytes)

✨ Generation complete! (1 file)

# TypeScript now sees updated types
$ pnpm typecheck
✅ No type errors
```

---

## CI/CD Integration

### Example 12: GitHub Actions Workflow

**Scenario**: Automated testing in CI/CD.

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Setup test environment
        run: |
          cp .env.example .env.test
          flusk env:validate --file .env.test || exit 1

      - name: Start infrastructure
        run: flusk infra:up --timeout 120

      - name: Run migrations
        run: flusk migrate

      - name: Run tests
        run: pnpm test

      - name: Cleanup
        if: always()
        run: flusk infra:down --volumes
```

**Running locally:**

```bash
$ cp .env.example .env.test
$ flusk env:validate --file .env.test
✅ All environment variables valid!

$ flusk infra:up
✨ Infrastructure started!

$ pnpm test
✅ All tests passed (42 tests)

$ flusk infra:down --volumes
✨ Infrastructure stopped and cleaned!
```

---

### Example 13: Docker Compose Production Setup

**Scenario**: Running Flusk in production with Docker Compose.

```bash
# Production docker-compose.override.yml
$ cat > docker-compose.override.yml <<'EOF'
version: '3.8'
services:
  postgres:
    environment:
      POSTGRES_DB: flusk_prod
      POSTGRES_USER: produser
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data

  redis:
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_prod_data:/data

volumes:
  postgres_prod_data:
  redis_prod_data:
EOF

# Setup production environment
$ flusk env:setup
? DATABASE_URL: postgresql://produser:${POSTGRES_PASSWORD}@postgres:5432/flusk_prod
? REDIS_URL: redis://:${REDIS_PASSWORD}@redis:6379
? NODE_ENV: production

# Start production infrastructure
$ export POSTGRES_PASSWORD=<secure-password>
$ export REDIS_PASSWORD=<secure-password>
$ flusk infra:up
✨ Infrastructure started successfully!

# Run migrations
$ flusk migrate
✨ Migrations complete!
```

---

## Troubleshooting Scenarios

### Example 14: Recovering from Corrupted Database

**Scenario**: Database is in an inconsistent state.

```bash
# Symptoms: Migrations failing
$ flusk migrate
❌ Migration failed: 003_create_orders.sql
   Error: relation "products" does not exist

# Diagnosis: Check what migrations were applied
$ psql $DATABASE_URL -c "SELECT * FROM _flusk_migrations;"
 id |        name         |       applied_at
----+---------------------+-------------------------
  1 | 001_users.sql       | 2026-02-06 10:00:00
  2 | 002_products.sql    | 2026-02-06 10:00:05
(2 rows)

# Solution 1: Reset and reapply all migrations
$ flusk infra:reset
✨ Infrastructure reset complete!

$ flusk migrate
  ✅ 001_users.sql
  ✅ 002_products.sql
  ✅ 003_orders.sql
✨ Migrations complete! (3 applied)

# Solution 2: Manual fix (if data must be preserved)
$ psql $DATABASE_URL
=> CREATE TABLE products (...);
=> \q

$ flusk migrate
✨ Migrations complete! (1 applied)
```

---

### Example 15: Environment Variable Issues

**Scenario**: Application can't connect to database.

```bash
# Application error
$ pnpm dev
Error: connect ECONNREFUSED 127.0.0.1:5432

# Step 1: Validate environment
$ flusk env:validate
❌ DATABASE_URL (invalid format)
   Expected: postgresql://user:pass@host:port/database

# Step 2: Fix .env file
$ flusk env:setup
? DATABASE_URL: postgresql://flusk:secret@localhost:5432/flusk
✅ Created .env file

# Step 3: Verify fix
$ flusk env:validate
✅ All environment variables valid!

# Step 4: Restart application
$ pnpm dev
✅ Application started on http://localhost:3000
```

---

### Example 16: Docker Resource Issues

**Scenario**: Infrastructure startup is slow or fails.

```bash
# Symptom: Timeout during startup
$ flusk infra:up
⚠️  PostgreSQL health check timeout (60s exceeded)

# Solution 1: Increase timeout
$ flusk infra:up --timeout 180
✨ Infrastructure started successfully! (startup time: 127.4s)

# Solution 2: Check Docker resources
$ docker system df
TYPE            TOTAL   ACTIVE   SIZE     RECLAIMABLE
Images          25      10       15.2GB   8.3GB (54%)
Containers      15      5        2.1GB    1.5GB (71%)
Local Volumes   30      5        25.7GB   20.1GB (78%)

# Clean up unused resources
$ docker system prune -a --volumes
Deleted Containers: 10
Deleted Images: 15
Deleted Volumes: 25
Total reclaimed space: 28.4GB

# Solution 3: Increase Docker Desktop resources
# Open Docker Desktop → Settings → Resources
# - CPUs: 4 (minimum)
# - Memory: 8GB (recommended)
# - Disk: 60GB (minimum)

# Try again
$ flusk infra:up
✨ Infrastructure started successfully! (startup time: 6.2s)
```

---

## Advanced Patterns

### Example 17: Multiple Projects on Same Machine

**Scenario**: Running multiple Flusk projects simultaneously.

```bash
# Project 1 (default ports)
$ cd ~/projects/api-project-1
$ flusk infra:up
✨ PostgreSQL on localhost:5432, Redis on localhost:6379

# Project 2 (custom ports)
$ cd ~/projects/api-project-2

# Edit docker-compose.yml ports
$ nano docker-compose.yml
# PostgreSQL: "5433:5432"
# Redis: "6380:6379"
# Adminer: "8081:8080"
# RedisInsight: "8002:8001"

# Update .env
$ nano .env
# DATABASE_URL=postgresql://flusk:secret@localhost:5433/flusk
# REDIS_URL=redis://localhost:6380

$ flusk infra:up
✨ PostgreSQL on localhost:5433, Redis on localhost:6380

# Both projects running simultaneously!
```

---

### Example 18: Custom Database Initialization

**Scenario**: Initialize database with seed data.

```bash
# After infrastructure is up and migrations complete
$ flusk infra:up
$ flusk migrate

# Run custom seed script
$ psql $DATABASE_URL <<'EOF'
INSERT INTO users (email, name) VALUES
  ('admin@example.com', 'Admin User'),
  ('user@example.com', 'Regular User');

INSERT INTO products (name, price) VALUES
  ('Product A', 19.99),
  ('Product B', 29.99);
EOF

# Verify seed data
$ curl http://localhost:3000/users
[
  {"id": "...", "email": "admin@example.com", "name": "Admin User"},
  {"id": "...", "email": "user@example.com", "name": "Regular User"}
]
```

---

For more information:
- [README.md](./README.md) - Command reference
- [USAGE.md](./USAGE.md) - Usage guide
- [../../docs/CLI_ENHANCEMENT_PLAN.md](../../docs/CLI_ENHANCEMENT_PLAN.md) - Feature roadmap
