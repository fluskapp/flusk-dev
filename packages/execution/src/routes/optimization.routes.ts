/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance } from 'fastify';
import { registerGenerateRoute } from './optimization-routes/generate.js';
import { registerListRoute } from './optimization-routes/list.js';
import { registerUpdateRoute } from './optimization-routes/update.js';
import { registerGetCodeRoute } from './optimization-routes/get-code.js';

/** Register all Optimization routes */
export async function optimizationRoutes(fastify: FastifyInstance): Promise<void> {
  registerGenerateRoute(fastify);
  registerListRoute(fastify);
  registerUpdateRoute(fastify);
  registerGetCodeRoute(fastify);
}
