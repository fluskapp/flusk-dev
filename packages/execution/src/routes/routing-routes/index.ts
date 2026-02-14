import type { FastifyInstance } from 'fastify';
import { registerRoutePrompt } from './route-prompt.js';
import { registerGetPerformance } from './get-performance.js';
import { registerGetSavings } from './get-savings.js';

export async function routingRoutes(fastify: FastifyInstance): Promise<void> {
  registerRoutePrompt(fastify);
  registerGetPerformance(fastify);
  registerGetSavings(fastify);
}
