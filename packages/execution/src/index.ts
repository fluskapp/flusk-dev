/**
 * @flusk/execution
 *
 * Fastify routes, plugins, and hooks for the Flusk platform.
 * Composes business logic functions with resources (DB, cache).
 */

// Main app factory
export { createApp } from './app.js';
export type { CreateAppOptions } from './app.js';

// Plugin exports
export { default as llmCallsPlugin } from './plugins/llm-calls.plugin.js';

// Route exports
export { llmCallsRoutes } from './routes/llm-calls.route.js';
export { healthRoutes } from './routes/health.routes.js';

// Middleware exports
export { errorHandler } from './middleware/error-handler.middleware.js';
export { authMiddleware, optionalAuthMiddleware } from './middleware/auth.middleware.js';

// Hook exports
export {
  hashPromptHook,
  checkCacheHook,
  calculateCostHook,
  cacheResponseHook
} from './hooks/llm-call.hooks.js';

// OTLP parsing exports (used by CLI analyze-receiver)
export { isGenAiSpan, parseLlmSpan } from './routes/otlp-routes/parse-llm-span.js';
export { mapSpanToLlmCall } from './routes/otlp-routes/map-span-to-llm-call.js';
export type { OtlpTraceRequest, OtlpSpan, ParsedLlmCall } from './routes/otlp-routes/types.js';
