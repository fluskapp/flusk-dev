# Infrastructure Templates

Infrastructure templates for Flusk CLI's `flusk init` command.

## Templates

### 1. docker-compose.yml (`docker-compose.template.ts`)
Generates Docker Compose configuration with:
- **PostgreSQL 16** with pgvector extension
- **Redis 7** with persistence and AOF
- **Adminer** - PostgreSQL web UI (port 8080)
- **RedisInsight** - Redis web UI (port 8001)
- Health checks for all services
- Persistent volumes for data
- Custom network configuration

**Options:**
```typescript
interface DockerComposeOptions {
  projectName: string;
  postgresPort?: number;    // default: 5432
  redisPort?: number;        // default: 6379
  adminerPort?: number;      // default: 8080
  redisInsightPort?: number; // default: 8001
}
```

### 2. .gitignore (`gitignore.template.ts`)
Comprehensive .gitignore for Node.js/TypeScript projects covering:
- Dependencies (node_modules, pnpm, yarn)
- Build output (dist, build)
- Environment files (.env*)
- TypeScript artifacts
- Testing coverage
- Database files
- Docker data
- IDE files (VS Code, JetBrains, Vim, etc.)
- OS files (macOS, Windows, Linux)
- Platformatic Watt specific
- Flusk specific patterns

### 3. .env.example (`env.template.ts`)
Environment variables template with:
- Application settings (NODE_ENV, PORT, HOST)
- PostgreSQL configuration
- Redis configuration
- LLM API keys (OpenAI, Anthropic, Google AI, Azure OpenAI)
- Flusk platform settings
- Security & authentication (JWT, CORS, rate limiting)
- Logging & monitoring (Sentry)
- Vector database (pgvector, embeddings)
- Docker Compose settings
- Development tools
- Testing configuration

**Options:**
```typescript
interface EnvTemplateOptions {
  projectName: string;
  postgresPort?: number; // default: 5432
  redisPort?: number;    // default: 6379
}
```

### 4. watt.json (`watt.template.ts`)
Platformatic Watt configuration with:
- Composer service configuration
- Server settings (hostname, port, logger)
- Watch mode for development
- Metrics configuration

Also generates `watt.service.json` for the main service:
- OpenAPI documentation enabled
- Plugin paths configuration
- Watch mode settings

**Options:**
```typescript
interface WattTemplateOptions {
  projectName: string;
  port?: number; // default: 3000
}
```

## Usage

```typescript
import {
  generateDockerComposeTemplate,
  generateGitignoreTemplate,
  generateEnvTemplate,
  generateWattTemplate,
  generateWattServiceTemplate
} from '@flusk/cli/templates/infrastructure';

// Generate docker-compose.yml
const dockerCompose = generateDockerComposeTemplate({ 
  projectName: 'my-api' 
});

// Generate .gitignore
const gitignore = generateGitignoreTemplate();

// Generate .env.example
const env = generateEnvTemplate({ 
  projectName: 'my-api',
  postgresPort: 5432,
  redisPort: 6379
});

// Generate watt.json
const watt = generateWattTemplate({ 
  projectName: 'my-api',
  port: 3000
});

// Generate watt.service.json
const wattService = generateWattServiceTemplate({ 
  projectName: 'my-api'
});
```

## File Locations

When used by `flusk init`, templates are written to:
- `docker-compose.yml` - Project root
- `.gitignore` - Project root
- `.env.example` - Project root
- `watt.json` - Project root
- `watt.service.json` - `/packages/execution/`

## Environment Variables

Templates use environment variable substitution syntax:
- Docker Compose: `${VAR_NAME:-default}`
- Watt JSON: `{VAR_NAME}` (replaced at runtime by Platformatic)

## Health Checks

All Docker services include health checks:
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Adminer**: HTTP check (depends on PostgreSQL)
- **RedisInsight**: HTTP check (depends on Redis)

## Volumes

Persistent volumes for data storage:
- `postgres_data` - PostgreSQL database files
- `redis_data` - Redis AOF persistence files
- `redisinsight_data` - RedisInsight configuration

## Security Best Practices

Templates include security defaults:
- Default passwords must be changed
- Environment files ignored by git
- Redis memory limits configured
- PostgreSQL connection pooling
- JWT secrets require generation
- CORS origins configurable

## Customization

After generation, developers can customize:
1. Port numbers (via .env file)
2. Resource limits (edit docker-compose.yml)
3. Service versions (update image tags)
4. Volume locations (edit volumes section)
5. Network settings (edit networks section)
