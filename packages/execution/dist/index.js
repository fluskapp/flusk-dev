/**
 * @flusk/execution
 *
 * Fastify routes, plugins, and hooks for the Flusk platform.
 * Composes business logic functions with resources (DB, cache).
 */
// Main app factory
export { createApp } from './app.js';
// Plugin exports
export { default as llmCallsPlugin } from './plugins/llm-calls.plugin.js';
// Route exports
export { llmCallsRoutes } from './routes/llm-calls.route.js';
export { healthRoutes } from './routes/health.routes.js';
// Middleware exports
export { errorHandler } from './middleware/error-handler.middleware.js';
export { authMiddleware, optionalAuthMiddleware } from './middleware/auth.middleware.js';
// Hook exports
export { hashPromptHook, checkCacheHook, calculateCostHook, cacheResponseHook } from './hooks/llm-call.hooks.js';
//# sourceMappingURL=index.js.map