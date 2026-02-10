/**
 * Flusk Platform - Real Server Entry Point
 * Wires execution package with PostgreSQL + Redis
 */
import { createApp } from '@flusk/execution';

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
    requireAuth: false, // Disable auth for local dev
    cors: { origin: true, credentials: true },
  });

  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 Flusk server running at http://localhost:${PORT}`);
    console.log(`📊 Health: http://localhost:${PORT}/health`);
    console.log(`📝 LLM Calls: POST http://localhost:${PORT}/api/v1/llm-calls`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
