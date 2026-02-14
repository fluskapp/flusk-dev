/**
 * DO NOT EDIT - regenerate using: flusk g pattern.entity.ts
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { patternRoutes } from '../routes/pattern.routes.js';

/**
 * Pattern plugin - encapsulates all pattern functionality
 */
async function patternPlugin(
  fastify: FastifyInstance
): Promise<void> {
  // Register routes under /patterns prefix
  await fastify.register(patternRoutes, { prefix: '/patterns' });

  fastify.log.info('Pattern plugin registered');
}

// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(patternPlugin, {
  name: 'pattern-plugin'
});
