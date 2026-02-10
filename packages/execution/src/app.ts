import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { healthRoutes } from './routes/health.routes.js';
import { llmCallsRoutes } from './routes/llm-calls.route.js';
import { patternRoutes } from './routes/pattern.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';

export interface CreateAppOptions {
  logger?: boolean;
  requireAuth?: boolean;
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
    cors,
  } = options;

  const app = Fastify({
    logger,
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

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

  // Feature routes under /api/v1
  await app.register(
    async (api) => {
      await api.register(llmCallsRoutes, { prefix: '/llm-calls' });
      await api.register(patternRoutes, { prefix: '/patterns' });
      await api.register(gdprRoutes);
    },
    { prefix: '/api/v1' }
  );

  return app;
}
