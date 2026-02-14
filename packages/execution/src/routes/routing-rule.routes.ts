/** @generated from RoutingRule YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingRuleEntitySchema } from '@flusk/entities';
import { RoutingRuleRepository } from '@flusk/resources';
const CreateRoutingRuleSchema = Type.Omit(RoutingRuleEntitySchema, ['id', 'createdAt', 'updatedAt']);
const RoutingRuleResponseSchema = RoutingRuleEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register RoutingRule routes
 */
export async function routingRuleRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateRoutingRuleSchema,
      response: { 201: RoutingRuleResponseSchema },
      tags: ['RoutingRule'],
      description: 'Create a new RoutingRule record',
    },
  }, async (request, reply) => {
    const created = await RoutingRuleRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: RoutingRuleResponseSchema, 404: NotFoundSchema },
      tags: ['RoutingRule'],
      description: 'Get a RoutingRule by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await RoutingRuleRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(RoutingRuleResponseSchema) },
      tags: ['RoutingRule'],
      description: 'List RoutingRule records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await RoutingRuleRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateRoutingRuleSchema),
      response: { 200: RoutingRuleResponseSchema, 404: NotFoundSchema },
      tags: ['RoutingRule'],
      description: 'Update a RoutingRule by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await RoutingRuleRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['RoutingRule'],
      description: 'Delete a RoutingRule by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await RoutingRuleRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---