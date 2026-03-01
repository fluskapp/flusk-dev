/** @generated from TrainingPair YAML — Traits: crud, time-range, aggregation */
// --- BEGIN GENERATED ---
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { TrainingPairEntitySchema } from '@flusk/entities';
import { TrainingPairRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateTrainingPairSchema = Type.Omit(TrainingPairEntitySchema as unknown as import("@sinclair/typebox").TObject, ['id', 'createdAt', 'updatedAt']);
const TrainingPairResponseSchema = TrainingPairEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register TrainingPair routes
 */
export async function trainingPairRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateTrainingPairSchema,
      response: { 201: TrainingPairResponseSchema as unknown as TSchema },
      tags: ['TrainingPair'],
      description: 'Create a new TrainingPair record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = TrainingPairRepository.createTrainingPair(fastify.db, request.body as any);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: TrainingPairResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['TrainingPair'],
      description: 'Get a TrainingPair by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = TrainingPairRepository.findTrainingPairById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(TrainingPairResponseSchema as unknown as TSchema) },
      tags: ['TrainingPair'],
      description: 'List TrainingPair records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = TrainingPairRepository.listTrainingPairs(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateTrainingPairSchema),
      response: { 200: TrainingPairResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['TrainingPair'],
      description: 'Update a TrainingPair by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = TrainingPairRepository.updateTrainingPair(fastify.db, id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['TrainingPair'],
      description: 'Delete a TrainingPair by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = TrainingPairRepository.deleteTrainingPair(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for TrainingPair */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return TrainingPairRepository.findTrainingPairsByTimeRange(fastify.db, from, to);
  });

  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as TrainingPairRepository.TrainingPairAggregateOptions; return TrainingPairRepository.aggregateTrainingPairs(fastify.db, opts); });
}// --- END GENERATED ---
