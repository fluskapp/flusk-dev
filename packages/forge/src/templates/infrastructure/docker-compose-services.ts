/**
 * Docker compose service templates — postgres and redis sections.
 */

export function postgresService(
  projectName: string,
  postgresPort: number,
): string {
  return `  # PostgreSQL 16 with pgvector extension
  postgres:
    image: pgvector/pgvector:pg16
    container_name: \${COMPOSE_PROJECT_NAME:-${projectName}}-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: \${POSTGRES_DB:-${projectName}}
      POSTGRES_USER: \${POSTGRES_USER:-${projectName}}
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:-dev_password_change_me}
      POSTGRES_INITDB_ARGS: "-E UTF8"
    ports:
      - "\${POSTGRES_PORT:-${postgresPort}}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d
      - ./profiles:/app/profiles
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \${POSTGRES_USER:-${projectName}} -d \${POSTGRES_DB:-${projectName}}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    networks:
      - ${projectName}_network`;
}

export function redisService(
  projectName: string,
  redisPort: number,
): string {
  return `  # Redis 7 with persistence
  redis:
    image: redis:7-alpine
    container_name: \${COMPOSE_PROJECT_NAME:-${projectName}}-redis
    restart: unless-stopped
    command: >
      redis-server
      --appendonly yes
      --appendfsync everysec
      --maxmemory 256mb
      --maxmemory-policy allkeys-lru
    ports:
      - "\${REDIS_PORT:-${redisPort}}:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
      start_period: 10s
    networks:
      - ${projectName}_network`;
}
