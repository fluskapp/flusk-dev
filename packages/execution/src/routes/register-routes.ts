/**
 * Registers all feature routes under /api/v1 prefix.
 */
import type { FastifyInstance } from 'fastify';
import { llmCallsRoutes } from './llm-calls.route.js';
import { patternRoutes } from './pattern.routes.js';
import gdprRoutes from './gdpr.routes.js';
import { similarityRoutes } from './similarity.routes.js';
import { costEventsRoutes } from './cost-events.routes.js';
import { routingRulesRoutes } from './routing-rules-routes/index.js';
import { routingRoutes } from './routing-routes/index.js';
import { traceRoutes } from './trace.routes.js';
import { spanRoutes } from './span.routes.js';
import { optimizationRoutes } from './optimization.routes.js';
import { prompttemplateRoutes } from './prompt-template-routes/index.js';
import { promptversionRoutes } from './prompt-version-routes/index.js';
import { profileRoutes } from './profile-routes/index.js';

export async function registerApiRoutes(api: FastifyInstance): Promise<void> {
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
  await api.register(profileRoutes, { prefix: '/profiles' });
}
