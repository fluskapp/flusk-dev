/** @generated from PerformancePattern YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PerformancePatternEntitySchema } from '@flusk/entities';
import { PerformancePatternRepository } from '@flusk/resources';
const CreatePerformancePatternSchema = Type.Omit(PerformancePatternEntitySchema, ['id', 'createdAt', 'updatedAt']);
const PerformancePatternResponseSchema = PerformancePatternEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register PerformancePattern routes
 */
export async function performancePatternRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreatePerformancePatternSchema,
      response: { 201: PerformancePatternResponseSchema },
      tags: ['PerformancePattern'],
      description: 'Create a new PerformancePattern record',
    },
  }, async (request, reply) => {
    const created = await PerformancePatternRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: PerformancePatternResponseSchema, 404: NotFoundSchema },
      tags: ['PerformancePattern'],
      description: 'Get a PerformancePattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await PerformancePatternRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(PerformancePatternResponseSchema) },
      tags: ['PerformancePattern'],
      description: 'List PerformancePattern records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await PerformancePatternRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreatePerformancePatternSchema),
      response: { 200: PerformancePatternResponseSchema, 404: NotFoundSchema },
      tags: ['PerformancePattern'],
      description: 'Update a PerformancePattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await PerformancePatternRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['PerformancePattern'],
      description: 'Delete a PerformancePattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await PerformancePatternRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---