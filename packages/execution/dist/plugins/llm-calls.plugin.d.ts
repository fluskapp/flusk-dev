import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
/**
 * LLM Calls Plugin
 * Encapsulates all LLM call routes with Fastify plugin pattern
 *
 * Uses plugin encapsulation to:
 * - Isolate route registration
 * - Enable route-level decorators
 * - Support plugin composition
 *
 * @param fastify - Fastify instance
 * @param opts - Plugin options with optional prefix
 */
declare function llmCallsPlugin(fastify: FastifyInstance, opts: FastifyPluginOptions & {
    prefix?: string;
}): Promise<void>;
/**
 * Export as Fastify plugin
 * Use fp() to avoid plugin encapsulation where needed
 * (allows decorators to be accessible in parent scope)
 */
declare const _default: typeof llmCallsPlugin;
export default _default;
//# sourceMappingURL=llm-calls.plugin.d.ts.map