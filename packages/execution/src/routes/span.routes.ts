import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { SpanEntitySchema } from '@flusk/entities';
import { SpanRepository } from '@flusk/resources';
const CreateSpanSchema = Type.Omit(SpanEntitySchema, ['id', 'createdAt', 'updatedAt']);
const SpanResponseSchema = SpanEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register Span routes
 */
export async function spanRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateSpanSchema,
      response: { 201: SpanResponseSchema },
      tags: ['Span'],
      description: 'Create a new Span record',
    },
  }, async (request, reply) => {
    const created = await SpanRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: SpanResponseSchema, 404: NotFoundSchema },
      tags: ['Span'],
      description: 'Get a Span by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await SpanRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(SpanResponseSchema) },
      tags: ['Span'],
      description: 'List Span records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await SpanRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateSpanSchema),
      response: { 200: SpanResponseSchema, 404: NotFoundSchema },
      tags: ['Span'],
      description: 'Update a Span by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await SpanRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['Span'],
      description: 'Delete a Span by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await SpanRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---