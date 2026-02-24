/** @generated from AlertChannel YAML — Traits: crud */
// --- BEGIN GENERATED (do not edit) ---
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { AlertChannelEntitySchema } from '@flusk/entities';
import { AlertChannelRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateAlertChannelSchema = Type.Omit(AlertChannelEntitySchema as any, ['id', 'createdAt', 'updatedAt']);
const AlertChannelResponseSchema = AlertChannelEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register AlertChannel routes
 */
export async function alertChannelRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateAlertChannelSchema,
      response: { 201: AlertChannelResponseSchema as unknown as TSchema },
      tags: ['AlertChannel'],
      description: 'Create a new AlertChannel record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = AlertChannelRepository.createAlertChannel(fastify.db, request.body as any);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: AlertChannelResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['AlertChannel'],
      description: 'Get a AlertChannel by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = AlertChannelRepository.findAlertChannelById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(AlertChannelResponseSchema as unknown as TSchema) },
      tags: ['AlertChannel'],
      description: 'List AlertChannel records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = AlertChannelRepository.listAlertChannels(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateAlertChannelSchema),
      response: { 200: AlertChannelResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['AlertChannel'],
      description: 'Update a AlertChannel by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = AlertChannelRepository.updateAlertChannel(fastify.db, id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['AlertChannel'],
      description: 'Delete a AlertChannel by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = AlertChannelRepository.deleteAlertChannel(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}// --- END GENERATED ---
