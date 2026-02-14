/**
 * DO NOT EDIT - regenerate using: flusk g trace.entity.ts
 */

import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { traceRoutes } from '../routes/trace.routes.js';

/**
 * Trace plugin - encapsulates all trace functionality
 */
async function tracePlugin(
  fastify: FastifyInstance
): Promise<void> {
  // Register routes under /traces prefix
  await fastify.register(traceRoutes, { prefix: '/traces' });

  fastify.log.info('Trace plugin registered');
}

// eslint-disable-next-line no-restricted-syntax -- fastify-plugin requires default export
export default fp(tracePlugin, {
  name: 'trace-plugin'
});
