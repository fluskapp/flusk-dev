import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { OptimizationEntitySchema } from '@flusk/entities';
import { OptimizationRepository } from '@flusk/resources';

const ListResponseSchema = Type.Array(OptimizationEntitySchema);

/**
 * Register Optimization routes
 */
export async function optimizationRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /** POST /optimizations/generate — generate optimization suggestions */
  fastify.post(
    '/generate',
    {
      schema: {
        body: Type.Object({
          organizationId: Type.String({ format: 'uuid' }),
        }),
        response: { 200: ListResponseSchema },
        tags: ['Optimization'],
        description: 'Generate optimization suggestions for an org',
      }
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { organizationId } = request.body as { organizationId: string };
      const results = await OptimizationRepository.generateForOrg(organizationId);
      return reply.code(200).send(results);
    }
  );

  /** GET /optimizations/:orgId — list optimizations for org */
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
      const items = await OptimizationRepository.findByOrg(request.params.orgId);
      return reply.code(200).send(items);
    }
  );

  /** PATCH /optimizations/:id — update status */
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
        request.params.id,
        { status }
      );
      if (!updated) return reply.code(404).send({ error: 'Not found' });
      return reply.code(200).send(updated);
    }
  );

  /** GET /optimizations/:id/code — get generated code */
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
      const entity = await OptimizationRepository.findById(request.params.id);
      if (!entity) return reply.code(404).send({ error: 'Not found' });
      return reply.code(200).send({
        code: entity.generatedCode,
        language: entity.language,
      });
    }
  );
}
