/** @generated from TrainingDataset YAML — Traits: crud, time-range, aggregation */
// --- BEGIN GENERATED ---
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { TrainingDatasetEntitySchema } from '@flusk/entities';
import { TrainingDatasetRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateTrainingDatasetSchema = Type.Omit(TrainingDatasetEntitySchema as unknown as import("@sinclair/typebox").TObject, ['id', 'createdAt', 'updatedAt']);
const TrainingDatasetResponseSchema = TrainingDatasetEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register TrainingDataset routes
 */
export async function trainingDatasetRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateTrainingDatasetSchema,
      response: { 201: TrainingDatasetResponseSchema as unknown as TSchema },
      tags: ['TrainingDataset'],
      description: 'Create a new TrainingDataset record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = TrainingDatasetRepository.createTrainingDataset(fastify.db, request.body as any);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: TrainingDatasetResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['TrainingDataset'],
      description: 'Get a TrainingDataset by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = TrainingDatasetRepository.findTrainingDatasetById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(TrainingDatasetResponseSchema as unknown as TSchema) },
      tags: ['TrainingDataset'],
      description: 'List TrainingDataset records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = TrainingDatasetRepository.listTrainingDatasets(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateTrainingDatasetSchema),
      response: { 200: TrainingDatasetResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['TrainingDataset'],
      description: 'Update a TrainingDataset by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = TrainingDatasetRepository.updateTrainingDataset(fastify.db, id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['TrainingDataset'],
      description: 'Delete a TrainingDataset by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = TrainingDatasetRepository.deleteTrainingDataset(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for TrainingDataset */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return TrainingDatasetRepository.findTrainingDatasetsByTimeRange(fastify.db, from, to);
  });

  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as TrainingDatasetRepository.TrainingDatasetAggregateOptions; return TrainingDatasetRepository.aggregateTrainingDatasets(fastify.db, opts); });
}// --- END GENERATED ---
