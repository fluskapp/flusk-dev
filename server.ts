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
    process.env.DATABASE_URL =
      'postgresql://flusk:dev_password_change_me@localhost:5432/flusk';
  }
  if (!process.env.REDIS_URL) {
    process.env.REDIS_URL = 'redis://localhost:6379';
  }

  const app = await createApp({
    logger: true,
    requireAuth: false,
    cors: { origin: true, credentials: true },
  });

  if (migrateOnly) {
    await app.ready();
    console.log('✅ Migrations complete');
    await app.close();
    process.exit(0);
  }

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 Flusk server running at http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📝 API Docs: http://localhost:${PORT}/docs`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
