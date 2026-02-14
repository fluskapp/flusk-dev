/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingRuleRepository } from '@flusk/resources';

const BodySchema = Type.Object({
  organizationId: Type.String(),
  name: Type.String(),
  qualityThreshold: Type.Number({ minimum: 0, maximum: 1 }),
  fallbackModel: Type.String(),
  enabled: Type.Optional(Type.Boolean()),
});

export function registerCreateRule(fastify: FastifyInstance): void {
  fastify.post('/', { schema: { body: BodySchema } }, async (request, reply) => {
    const body = request.body as {
      organizationId: string; name: string;
      qualityThreshold: number; fallbackModel: string; enabled?: boolean;
    };
    const rule = await RoutingRuleRepository.create(fastify.pg.pool, {
      ...body,
      enabled: body.enabled ?? false,
    });
    return reply.status(201).send(rule);
  });
}
