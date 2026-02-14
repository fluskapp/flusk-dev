/**
 * DO NOT EDIT - regenerate using: flusk g prompt-version.entity.ts
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { promptversionRoutes } from '../routes/prompt-version.routes.js';

/**
 * PromptVersion plugin - encapsulates all prompt-version functionality
 */
async function promptversionPlugin(
  fastify: FastifyInstance
): Promise<void> {
  // Register routes under /prompt-versions prefix
  await fastify.register(promptversionRoutes, { prefix: '/prompt-versions' });

  fastify.log.info('PromptVersion plugin registered');
}

// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(promptversionPlugin, {
  name: 'prompt-version-plugin'
});
