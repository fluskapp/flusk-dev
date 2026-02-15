import type { EventEmitter } from 'node:events';
import type { DatabaseSync } from 'node:sqlite';

declare module 'fastify' {
  interface FastifyInstance {
    eventBus?: EventEmitter;
    config: {
      DATABASE_URL: string;
      REDIS_URL: string;
      PORT: number;
      HOST: string;
      LOG_LEVEL: string;
      FLUSK_API_KEY: string;
      NODE_ENV: string;
      [key: string]: unknown;
    };
    db: DatabaseSync;
  }
}
