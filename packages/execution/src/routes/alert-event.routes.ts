/** @generated from AlertEvent YAML — Traits: crud, time-range */
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { AlertEventEntitySchema } from '@flusk/entities';
import { AlertEventRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateAlertEventSchema = Type.Omit(AlertEventEntitySchema as any, ['id', 'createdAt', 'updatedAt']);
const AlertEventResponseSchema = AlertEventEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register AlertEvent routes
 */
export async function alertEventRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateAlertEventSchema,
      response: { 201: AlertEventResponseSchema as unknown as TSchema },
      tags: ['AlertEvent'],
      description: 'Create a new AlertEvent record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = AlertEventRepository.createAlertEvent(fastify.db, request.body as any);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: AlertEventResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['AlertEvent'],
      description: 'Get a AlertEvent by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = AlertEventRepository.findAlertEventById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(AlertEventResponseSchema as unknown as TSchema) },
      tags: ['AlertEvent'],
      description: 'List AlertEvent records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = AlertEventRepository.listAlertEvents(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateAlertEventSchema),
      response: { 200: AlertEventResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['AlertEvent'],
      description: 'Update a AlertEvent by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = AlertEventRepository.updateAlertEvent(fastify.db, id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['AlertEvent'],
      description: 'Delete a AlertEvent by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = AlertEventRepository.deleteAlertEvent(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for AlertEvent */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return AlertEventRepository.findAlertEventsByTimeRange(fastify.db, from, to);
  });
}