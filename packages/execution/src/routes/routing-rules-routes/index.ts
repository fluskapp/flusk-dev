/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance } from 'fastify';
import { registerCreateRule } from './create-rule.js';
import { registerGetRules } from './get-rules.js';
import { registerUpdateRule } from './update-rule.js';
import { registerDeleteRule } from './delete-rule.js';

export async function routingRulesRoutes(fastify: FastifyInstance): Promise<void> {
  registerCreateRule(fastify);
  registerGetRules(fastify);
  registerUpdateRule(fastify);
  registerDeleteRule(fastify);
}
