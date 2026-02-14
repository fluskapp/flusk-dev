/**
 * Flusk Platform - Real Server Entry Point
 * Wires execution package with PostgreSQL + Redis
 */
import { createApp } from '@flusk/execution';

const migrateOnly = process.argv.includes('--migrate-only');

async function start() {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  // Validate required env vars
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379';
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const app = await createApp({
    logger: true,
    requireAuth: true,
    cors: { origin: corsOrigin, credentials: true },
  });

  if (migrateOnly) {
    await app.ready();
    app.log.info('Migrations complete');
    await app.close();
    process.exit(0);
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Flusk server running at http://localhost:${PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
