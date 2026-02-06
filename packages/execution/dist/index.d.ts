/**
 * @flusk/execution
 *
 * Fastify routes, plugins, and hooks for the Flusk platform.
 * Composes business logic functions with resources (DB, cache).
 */
export { createApp } from './app.js';
export type { CreateAppOptions } from './app.js';
export { default as llmCallsPlugin } from './plugins/llm-calls.plugin.js';
export { llmCallsRoutes } from './routes/llm-calls.route.js';
export { healthRoutes } from './routes/health.routes.js';
export { errorHandler } from './middleware/error-handler.middleware.js';
export { authMiddleware, optionalAuthMiddleware } from './middleware/auth.middleware.js';
export { hashPromptHook, checkCacheHook, calculateCostHook, cacheResponseHook } from './hooks/llm-call.hooks.js';
//# sourceMappingURL=index.d.ts.map