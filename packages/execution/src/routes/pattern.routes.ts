/** @generated from Pattern YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PatternEntitySchema } from '@flusk/entities';
import { PatternRepository } from '@flusk/resources';
const CreatePatternSchema = Type.Omit(PatternEntitySchema, ['id', 'createdAt', 'updatedAt']);
const PatternResponseSchema = PatternEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register Pattern routes
 */
export async function patternRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreatePatternSchema,
      response: { 201: PatternResponseSchema },
      tags: ['Pattern'],
      description: 'Create a new Pattern record',
    },
  }, async (request, reply) => {
    const created = await PatternRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: PatternResponseSchema, 404: NotFoundSchema },
      tags: ['Pattern'],
      description: 'Get a Pattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await PatternRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(PatternResponseSchema) },
      tags: ['Pattern'],
      description: 'List Pattern records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await PatternRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreatePatternSchema),
      response: { 200: PatternResponseSchema, 404: NotFoundSchema },
      tags: ['Pattern'],
      description: 'Update a Pattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await PatternRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['Pattern'],
      description: 'Delete a Pattern by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await PatternRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---