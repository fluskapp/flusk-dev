/** @generated from LLMCall YAML — Traits: crud, aggregation, time-range */
// --- BEGIN GENERATED ---
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { LLMCallEntitySchema } from '@flusk/entities';
import { LLMCallRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateLLMCallSchema = Type.Omit(LLMCallEntitySchema as unknown as import("@sinclair/typebox").TObject, ['id', 'createdAt', 'updatedAt']);
const LLMCallResponseSchema = LLMCallEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register LLMCall routes
 */
export async function llmCallRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateLLMCallSchema,
      response: { 201: LLMCallResponseSchema as unknown as TSchema },
      tags: ['LLMCall'],
      description: 'Create a new LLMCall record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = LLMCallRepository.createLLMCall(fastify.db, request.body as Record<string, unknown>);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: LLMCallResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['LLMCall'],
      description: 'Get a LLMCall by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = LLMCallRepository.findLLMCallById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(LLMCallResponseSchema as unknown as TSchema) },
      tags: ['LLMCall'],
      description: 'List LLMCall records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = LLMCallRepository.listLLMCalls(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateLLMCallSchema),
      response: { 200: LLMCallResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['LLMCall'],
      description: 'Update a LLMCall by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = LLMCallRepository.updateLLMCall(fastify.db, id, request.body as Record<string, unknown>);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['LLMCall'],
      description: 'Delete a LLMCall by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = LLMCallRepository.deleteLLMCall(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as LLMCallRepository.LLMCallAggregateOptions; return LLMCallRepository.aggregateLLMCalls(fastify.db, opts); });

  /** Time-range query route for LLMCall */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return LLMCallRepository.findLLMCallsByTimeRange(fastify.db, from, to);
  });
}// --- END GENERATED ---
