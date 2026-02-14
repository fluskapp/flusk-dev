/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';
import { llmCallsRoutes } from '../routes/llm-calls.route.js';

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
async function llmCallsPlugin(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & { prefix?: string }
): Promise<void> {
  // Register routes under the plugin scope
  // Default prefix: /llm-calls (can be overridden via opts.prefix)
  await fastify.register(llmCallsRoutes, {
    prefix: opts.prefix || '/llm-calls'
  });
}

/**
 * Export as Fastify plugin
 * Use fp() to avoid plugin encapsulation where needed
 * (allows decorators to be accessible in parent scope)
 */
// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(llmCallsPlugin, {
  name: 'llm-calls-plugin',
  fastify: '5.x'
});
