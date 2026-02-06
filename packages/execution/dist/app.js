import Fastify from 'fastify';
import { errorHandler } from './middleware/error-handler.middleware.js';
import { healthRoutes } from './routes/health.routes.js';
import llmCallsPlugin from './plugins/llm-calls.plugin.js';
import patternPlugin from './plugins/pattern.plugin.js';
import gdprRoutes from './routes/gdpr.routes.js';
/**
 * Create and configure Fastify application
 *
 * Architecture:
 * 1. Initialize Fastify with TypeBox type provider
 * 2. Register global error handler
 * 3. Register health check routes
 * 4. Register feature plugins (LLM calls, patterns, conversions)
 * 5. Return configured instance
 *
 * @param options - Application configuration options
 * @returns Configured Fastify instance
 */
export async function createApp(options = {}) {
    const { logger = process.env.NODE_ENV !== 'production', requireAuth = false, cors } = options;
    // Initialize Fastify with TypeBox type provider
    const app = Fastify({
        logger,
        // Generate request IDs for tracing
        requestIdHeader: 'x-request-id',
        requestIdLogLabel: 'requestId',
        disableRequestLogging: false,
        // Trust proxy headers (for load balancers)
        trustProxy: true
    }).withTypeProvider();
    // Register global error handler
    app.setErrorHandler(errorHandler);
    // Register CORS if configured
    if (cors) {
        await app.register(import('@fastify/cors'), {
            origin: cors.origin,
            credentials: cors.credentials ?? false
        });
    }
    // Register health check routes (no auth required)
    await app.register(healthRoutes);
    // Register authentication middleware if required
    if (requireAuth) {
        const { authMiddleware } = await import('./middleware/auth.middleware.js');
        app.addHook('onRequest', authMiddleware);
    }
    // Register feature plugins under /api/v1
    await app.register(llmCallsPlugin, { prefix: '/api/v1' });
    await app.register(patternPlugin, { prefix: '/api/v1' });
    // Register GDPR compliance routes
    await app.register(gdprRoutes, { prefix: '/api/v1' });
    return app;
}
//# sourceMappingURL=app.js.map