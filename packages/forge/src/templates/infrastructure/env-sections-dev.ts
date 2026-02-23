/**
 * Docker, dev tools, and testing sections for .env.example.
 */

export function envDockerSection(projectName: string): string {
  return `# ============================================
# Docker Compose
# ============================================

# Project name for Docker Compose
COMPOSE_PROJECT_NAME=${projectName}

# Service ports (used by docker-compose.yml)
ADMINER_PORT=8080
REDISINSIGHT_PORT=8001`;
}

export function envDevToolsSection(): string {
  return `# ============================================
# Development Tools
# ============================================

# Enable GraphQL Playground
GRAPHQL_PLAYGROUND=true

# Enable API documentation (Swagger/OpenAPI)
API_DOCS_ENABLED=true

# Enable request logging
REQUEST_LOGGING=true`;
}

export function envTestingSection(
  projectName: string,
  postgresPort: number,
  redisPort: number,
): string {
  return `# ============================================
# Testing
# ============================================

# Test database (separate from development)
TEST_DATABASE_URL=postgresql://${projectName}:dev_password_change_me@localhost:${postgresPort}/${projectName}_test

# Test Redis
TEST_REDIS_URL=redis://localhost:${redisPort}/15`;
}
