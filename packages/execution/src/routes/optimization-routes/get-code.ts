/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { OptimizationRepository } from '@flusk/resources';

/** GET /optimizations/:id/code — get generated code */
export function registerGetCodeRoute(fastify: FastifyInstance): void {
  fastify.get(
    '/:id/code',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        response: {
          200: Type.Object({
            code: Type.String(),
            language: Type.String(),
          }),
          404: Type.Object({ error: Type.String() }),
        },
        tags: ['Optimization'],
      }
    },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const entity = await OptimizationRepository.findById(fastify.pg.pool, request.params.id);
      if (!entity) return reply.code(404).send({ error: 'Not found' });
      return reply.code(200).send({
        code: entity.generatedCode,
        language: entity.language,
      });
    }
  );
}
