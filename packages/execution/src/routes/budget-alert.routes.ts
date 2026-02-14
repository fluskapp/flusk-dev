import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { BudgetAlertEntitySchema } from '@flusk/entities';
import { BudgetAlertRepository } from '@flusk/resources';
const CreateBudgetAlertSchema = Type.Omit(BudgetAlertEntitySchema, ['id', 'createdAt', 'updatedAt']);
const BudgetAlertResponseSchema = BudgetAlertEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register BudgetAlert routes
 */
export async function budgetAlertRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateBudgetAlertSchema,
      response: { 201: BudgetAlertResponseSchema },
      tags: ['BudgetAlert'],
      description: 'Create a new BudgetAlert record',
    },
  }, async (request, reply) => {
    const created = await BudgetAlertRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: BudgetAlertResponseSchema, 404: NotFoundSchema },
      tags: ['BudgetAlert'],
      description: 'Get a BudgetAlert by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await BudgetAlertRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(BudgetAlertResponseSchema) },
      tags: ['BudgetAlert'],
      description: 'List BudgetAlert records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await BudgetAlertRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateBudgetAlertSchema),
      response: { 200: BudgetAlertResponseSchema, 404: NotFoundSchema },
      tags: ['BudgetAlert'],
      description: 'Update a BudgetAlert by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await BudgetAlertRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['BudgetAlert'],
      description: 'Delete a BudgetAlert by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await BudgetAlertRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for BudgetAlert */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return BudgetAlertRepository.findBudgetAlertsByTimeRange(fastify.db, from, to);
  });

  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as BudgetAlertRepository.BudgetAlertAggregateOptions; return BudgetAlertRepository.aggregateBudgetAlerts(fastify.db, opts); });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---