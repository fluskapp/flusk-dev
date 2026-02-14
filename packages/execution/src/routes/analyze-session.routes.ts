/** @generated from AnalyzeSession YAML — Traits: crud, time-range */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { AnalyzeSessionEntitySchema } from '@flusk/entities';
import { AnalyzeSessionRepository } from '@flusk/resources';
const CreateAnalyzeSessionSchema = Type.Omit(AnalyzeSessionEntitySchema, ['id', 'createdAt', 'updatedAt']);
const AnalyzeSessionResponseSchema = AnalyzeSessionEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register AnalyzeSession routes
 */
export async function analyzeSessionRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateAnalyzeSessionSchema,
      response: { 201: AnalyzeSessionResponseSchema },
      tags: ['AnalyzeSession'],
      description: 'Create a new AnalyzeSession record',
    },
  }, async (request, reply) => {
    const created = await AnalyzeSessionRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: AnalyzeSessionResponseSchema, 404: NotFoundSchema },
      tags: ['AnalyzeSession'],
      description: 'Get a AnalyzeSession by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await AnalyzeSessionRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(AnalyzeSessionResponseSchema) },
      tags: ['AnalyzeSession'],
      description: 'List AnalyzeSession records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await AnalyzeSessionRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateAnalyzeSessionSchema),
      response: { 200: AnalyzeSessionResponseSchema, 404: NotFoundSchema },
      tags: ['AnalyzeSession'],
      description: 'Update a AnalyzeSession by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await AnalyzeSessionRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['AnalyzeSession'],
      description: 'Delete a AnalyzeSession by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await AnalyzeSessionRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for AnalyzeSession */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return AnalyzeSessionRepository.findAnalyzeSessionsByTimeRange(fastify.db, from, to);
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---