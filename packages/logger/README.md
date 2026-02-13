# @flusk/logger

Structured logging for the Flusk platform, powered by [Pino](https://github.com/pinojs/pino).

## Usage

```typescript
import { getLogger } from '@flusk/logger';

const logger = getLogger().child({ module: 'my-module' });

logger.info({ userId: 42 }, 'user created');
logger.error({ err }, 'operation failed');
```

## Environment Variables

- `FLUSK_LOG_LEVEL` — log level (default: `info`)
- `NODE_ENV` — when not `production`, enables pino-pretty
