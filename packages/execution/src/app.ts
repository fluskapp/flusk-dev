import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { healthRoutes } from './routes/health.routes.js';
import { llmCallsRoutes } from './routes/llm-calls.route.js';
import { patternRoutes } from './routes/pattern.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import { similarityRoutes } from './routes/similarity.routes.js';
import { costEventsRoutes } from './routes/cost-events.routes.js';
import { routingRulesRoutes } from './routes/routing-rules-routes/index.js';
import { routingRoutes } from './routes/routing-routes/index.js';
import { traceRoutes } from './routes/trace.routes.js';
import { spanRoutes } from './routes/span.routes.js';
import { optimizationRoutes } from './routes/optimization.routes.js';
import { prompttemplateRoutes } from './routes/prompt-template-routes/index.js';
import { promptversionRoutes } from './routes/prompt-version-routes/index.js';

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
      await api.register(similarityRoutes, { prefix: '/similarity' });
      await api.register(costEventsRoutes, { prefix: '/events/costs' });
      await api.register(routingRulesRoutes, { prefix: '/routing-rules' });
      await api.register(routingRoutes, { prefix: '/route' });
      await api.register(traceRoutes, { prefix: '/traces' });
      await api.register(spanRoutes, { prefix: '/spans' });
      await api.register(optimizationRoutes, { prefix: '/optimizations' });
      await api.register(prompttemplateRoutes, { prefix: '/prompt-templates' });
      await api.register(promptversionRoutes, { prefix: '/prompt-versions' });
    },
    { prefix: '/api/v1' }
  );

  return app;
}
