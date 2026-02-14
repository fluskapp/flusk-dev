/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingRuleRepository } from '@flusk/resources';

const BodySchema = Type.Partial(Type.Object({
  name: Type.String(),
  qualityThreshold: Type.Number({ minimum: 0, maximum: 1 }),
  fallbackModel: Type.String(),
  enabled: Type.Boolean(),
}));

export function registerUpdateRule(fastify: FastifyInstance): void {
  fastify.patch('/:id', {
    schema: {
      params: Type.Object({ id: Type.String() }),
      body: BodySchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const rule = await RoutingRuleRepository.update(fastify.pg.pool, id, body as Record<string, unknown>);
    if (!rule) return reply.status(404).send({ error: 'Not found' });
    return rule;
  });
}
