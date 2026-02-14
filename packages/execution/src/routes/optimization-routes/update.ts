/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { OptimizationEntitySchema } from '@flusk/entities';
import { OptimizationRepository } from '@flusk/resources';

/** PATCH /optimizations/:id — update status */
export function registerUpdateRoute(fastify: FastifyInstance): void {
  fastify.patch(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        body: Type.Object({
          status: Type.Union([
            Type.Literal('applied'),
            Type.Literal('dismissed'),
          ]),
        }),
        response: {
          200: OptimizationEntitySchema,
          404: Type.Object({ error: Type.String() }),
        },
        tags: ['Optimization'],
      }
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { status } = request.body as { status: string };
      const updated = await OptimizationRepository.update(
        fastify.pg.pool, request.params.id, { status }
      );
      if (!updated) return reply.code(404).send({ error: 'Not found' });
      return reply.code(200).send(updated);
    }
  );
}
