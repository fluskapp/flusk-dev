/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { OptimizationEntitySchema } from '@flusk/entities';
import { OptimizationRepository } from '@flusk/resources';

const ListResponseSchema = Type.Array(OptimizationEntitySchema);

/** GET /optimizations/:orgId — list optimizations for org */
export function registerListRoute(fastify: FastifyInstance): void {
  fastify.get(
    '/:orgId',
    {
      schema: {
        params: Type.Object({ orgId: Type.String({ format: 'uuid' }) }),
        response: { 200: ListResponseSchema },
        tags: ['Optimization'],
      }
    },
    async (
      request: FastifyRequest<{ Params: { orgId: string } }>,
      reply: FastifyReply
    ) => {
      const items = await OptimizationRepository.findByOrg(fastify.pg.pool, request.params.orgId);
      return reply.code(200).send(items);
    }
  );
}
