/**
 * Application and database sections for .env.example.
 */

export function envAppSection(): string {
  return `# ============================================
# Application
# ============================================

# Node environment (development | production | test)
NODE_ENV=development

# Application server
PORT=3000
HOST=0.0.0.0

# API base URL (for client SDKs)
API_BASE_URL=http://localhost:3000`;
}

export function envDatabaseSection(
  projectName: string,
  postgresPort: number,
): string {
  return `# ============================================
# Database (PostgreSQL)
# ============================================

# PostgreSQL connection string
# Format: postgresql://[user]:[password]@[host]:[port]/[database]
DATABASE_URL=postgresql://${projectName}:dev_password_change_me@localhost:${postgresPort}/${projectName}

# Individual PostgreSQL settings (optional, overrides DATABASE_URL)
POSTGRES_HOST=localhost
POSTGRES_PORT=${postgresPort}
POSTGRES_DB=${projectName}
POSTGRES_USER=${projectName}
POSTGRES_PASSWORD=dev_password_change_me

# Connection pool settings
POSTGRES_POOL_MIN=2
POSTGRES_POOL_MAX=20
POSTGRES_POOL_IDLE_TIMEOUT=30000`;
}

export function envCacheSection(
  projectName: string,
  redisPort: number,
): string {
  return `# ============================================
# Cache & Queue (Redis)
# ============================================

# Redis connection string
# Format: redis://[host]:[port]/[db]
REDIS_URL=redis://localhost:${redisPort}/0

# Individual Redis settings (optional, overrides REDIS_URL)
REDIS_HOST=localhost
REDIS_PORT=${redisPort}
REDIS_DB=0
REDIS_PASSWORD=

# Redis Streams (for job queue)
REDIS_STREAM_NAME=${projectName}_jobs
REDIS_CONSUMER_GROUP=${projectName}_workers`;
}
