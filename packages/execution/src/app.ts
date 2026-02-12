import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { plugin as configPlugin } from './plugins/config.plugin.js';
import { plugin as postgresPlugin } from './plugins/postgres.plugin.js';
import { plugin as redisPlugin } from './plugins/redis.plugin.js';
import { plugin as sensiblePlugin } from './plugins/sensible.plugin.js';
import { plugin as migratePlugin } from './plugins/migrate.plugin.js';
import { healthRoutes } from './routes/health.routes.js';
import { otlpRoutes } from './routes/otlp-routes/index.js';
import { registerApiRoutes } from './routes/register-routes.js';

export interface CreateAppOptions {
  logger?: boolean;
  requireAuth?: boolean;
  skipDb?: boolean;
  cors?: {
    origin: string | string[] | boolean;
    credentials?: boolean;
  };
}

/**
 * Create and configure the Fastify application
 */
export async function createApp(
  options: CreateAppOptions = {}
): Promise<FastifyInstance> {
  const {
    logger = process.env.NODE_ENV !== 'production',
    requireAuth = false,
    skipDb = false,
    cors,
  } = options;

  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 1. Config
  await app.register(configPlugin);

  // 2. Infrastructure (skip in unit tests)
  if (!skipDb) {
    await app.register(postgresPlugin);
    await app.register(redisPlugin);
    await app.register(sensiblePlugin);
    await app.register(migratePlugin);
  }

  app.setErrorHandler(errorHandler);

  if (cors) {
    await app.register(import('@fastify/cors'), {
      origin: cors.origin,
      credentials: cors.credentials ?? false,
    });
  }

  // Decorate request with organizationId
  app.decorateRequest('organizationId', '');

  // Health (no prefix, no auth)
  await app.register(healthRoutes);

  // Auth middleware (if enabled)
  if (requireAuth) {
    const { authMiddleware } = await import('./middleware/auth.middleware.js');
    app.addHook('onRequest', authMiddleware);
  }

  // OTLP ingestion (no auth — uses x-flusk-api-key header)
  await app.register(otlpRoutes, { prefix: '/v1' });

  // Feature routes under /api/v1
  await app.register(registerApiRoutes, { prefix: '/api/v1' });

  return app;
}
