/** @generated from Conversion YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ConversionEntitySchema } from '@flusk/entities';
import { ConversionRepository } from '@flusk/resources';
const CreateConversionSchema = Type.Omit(ConversionEntitySchema, ['id', 'createdAt', 'updatedAt']);
const ConversionResponseSchema = ConversionEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register Conversion routes
 */
export async function conversionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateConversionSchema,
      response: { 201: ConversionResponseSchema },
      tags: ['Conversion'],
      description: 'Create a new Conversion record',
    },
  }, async (request, reply) => {
    const created = await ConversionRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: ConversionResponseSchema, 404: NotFoundSchema },
      tags: ['Conversion'],
      description: 'Get a Conversion by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await ConversionRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(ConversionResponseSchema) },
      tags: ['Conversion'],
      description: 'List Conversion records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await ConversionRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateConversionSchema),
      response: { 200: ConversionResponseSchema, 404: NotFoundSchema },
      tags: ['Conversion'],
      description: 'Update a Conversion by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await ConversionRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['Conversion'],
      description: 'Delete a Conversion by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await ConversionRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---