/**
 * DO NOT EDIT - regenerate using: flusk g llm-call.entity.ts
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { llmcallRoutes } from '../routes/llm-call.routes.js';

/**
 * LLMCall plugin - encapsulates all llm-call functionality
 */
async function llmcallPlugin(
  fastify: FastifyInstance
): Promise<void> {
  // Register routes under /llm-calls prefix
  await fastify.register(llmcallRoutes, { prefix: '/llm-calls' });

  fastify.log.info('LLMCall plugin registered');
}

// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(llmcallPlugin, {
  name: 'llm-call-plugin'
});
