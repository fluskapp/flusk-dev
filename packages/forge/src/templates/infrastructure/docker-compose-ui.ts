/**
 * Docker compose UI service templates — adminer and redisinsight.
 */

export function adminerService(
  projectName: string,
  adminerPort: number,
): string {
  return `  # Adminer - PostgreSQL Web UI
  adminer:
    image: adminer:latest
    container_name: \${COMPOSE_PROJECT_NAME:-${projectName}}-adminer
    restart: unless-stopped
    environment:
      ADMINER_DEFAULT_SERVER: postgres
      ADMINER_DESIGN: nette
    ports:
      - "\${ADMINER_PORT:-${adminerPort}}:8080"
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - ${projectName}_network`;
}

export function redisInsightService(
  projectName: string,
  redisInsightPort: number,
): string {
  return `  # RedisInsight - Redis Web UI
  redisinsight:
    image: redislabs/redisinsight:latest
    container_name: \${COMPOSE_PROJECT_NAME:-${projectName}}-redisinsight
    restart: unless-stopped
    ports:
      - "\${REDISINSIGHT_PORT:-${redisInsightPort}}:8001"
    volumes:
      - redisinsight_data:/db
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - ${projectName}_network`;
}

export function volumesAndNetworks(projectName: string): string {
  return `# Persistent volumes
volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  redisinsight_data:
    driver: local

# Internal network
networks:
  ${projectName}_network:
    driver: bridge`;
}
