/**
 * Flusk Platform - Server Entry Point
 * SQLite-only architecture — zero external deps
 */
import { createApp } from '@flusk/execution';

const migrateOnly = process.argv.includes('--migrate-only');

async function start() {
  const PORT = Number(process.env.PORT) || 3000;
  const HOST = process.env.HOST || '0.0.0.0';

  const corsOriginRaw = process.env.FLUSK_CORS_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000';
  const corsOrigin = corsOriginRaw.includes(',') ? corsOriginRaw.split(',').map(s => s.trim()) : corsOriginRaw;
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
