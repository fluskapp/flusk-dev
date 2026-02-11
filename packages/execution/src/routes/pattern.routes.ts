import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PatternEntitySchema } from '@flusk/entities';
import { PatternRepository } from '@flusk/resources';

const PatternResponseSchema = PatternEntitySchema;

/**
 * Register pattern routes
 */
export async function patternRoutes(
  fastify: FastifyInstance
): Promise<void> {
  /** GET /patterns — list with optional filters */
  fastify.get(
    '/',
    {
      schema: {
        querystring: Type.Object({
          organizationId: Type.Optional(Type.String()),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 1000 })),
          offset: Type.Optional(Type.Integer({ minimum: 0 })),
        }),
        response: {
          200: Type.Object({
            patterns: Type.Array(PatternResponseSchema),
            total: Type.Integer(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = request.query as {
        organizationId?: string;
        limit?: number;
        offset?: number;
      };
      let patterns;
      if (q.organizationId) {
        patterns = await PatternRepository.findByOrganization(
          q.organizationId,
          { limit: q.limit, offset: q.offset }
        );
      } else {
        patterns = await PatternRepository.findMany(q.limit || 100, q.offset || 0);
      }
      return reply.send({ patterns, total: patterns.length });
    }
  );

  /** GET /patterns/:id — get by UUID */
  fastify.get(
    '/:id',
    {
      schema: {
        params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
        response: {
          200: PatternResponseSchema,
          404: Type.Object({ error: Type.String() }),
        },
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const entity = await PatternRepository.findById(request.params.id);
      if (!entity) return reply.code(404).send({ error: 'Pattern not found' });
      return reply.send(entity);
    }
  );

  /** POST /patterns — create */
  fastify.post(
    '/',
    {
      schema: {
        body: Type.Omit(PatternEntitySchema, ['id', 'createdAt', 'updatedAt']),
        response: { 201: PatternResponseSchema },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const created = await PatternRepository.create(request.body as any);
      return reply.code(201).send(created);
    }
  );
}
