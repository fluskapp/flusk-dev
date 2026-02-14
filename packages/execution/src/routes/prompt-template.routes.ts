/** @generated from PromptTemplate YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PromptTemplateEntitySchema } from '@flusk/entities';
import { PromptTemplateRepository } from '@flusk/resources';
const CreatePromptTemplateSchema = Type.Omit(PromptTemplateEntitySchema, ['id', 'createdAt', 'updatedAt']);
const PromptTemplateResponseSchema = PromptTemplateEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register PromptTemplate routes
 */
export async function promptTemplateRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreatePromptTemplateSchema,
      response: { 201: PromptTemplateResponseSchema },
      tags: ['PromptTemplate'],
      description: 'Create a new PromptTemplate record',
    },
  }, async (request, reply) => {
    const created = await PromptTemplateRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: PromptTemplateResponseSchema, 404: NotFoundSchema },
      tags: ['PromptTemplate'],
      description: 'Get a PromptTemplate by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await PromptTemplateRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(PromptTemplateResponseSchema) },
      tags: ['PromptTemplate'],
      description: 'List PromptTemplate records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await PromptTemplateRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreatePromptTemplateSchema),
      response: { 200: PromptTemplateResponseSchema, 404: NotFoundSchema },
      tags: ['PromptTemplate'],
      description: 'Update a PromptTemplate by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await PromptTemplateRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['PromptTemplate'],
      description: 'Delete a PromptTemplate by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await PromptTemplateRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---