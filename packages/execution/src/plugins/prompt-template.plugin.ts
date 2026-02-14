/**
 * DO NOT EDIT - regenerate using: flusk g prompt-template.entity.ts
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { prompttemplateRoutes } from '../routes/prompt-template.routes.js';

/**
 * PromptTemplate plugin - encapsulates all prompt-template functionality
 */
async function prompttemplatePlugin(
  fastify: FastifyInstance
): Promise<void> {
  // Register routes under /prompt-templates prefix
  await fastify.register(prompttemplateRoutes, { prefix: '/prompt-templates' });

  fastify.log.info('PromptTemplate plugin registered');
}

// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(prompttemplatePlugin, {
  name: 'prompt-template-plugin'
});
