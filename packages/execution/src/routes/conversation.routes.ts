/** @generated from Conversation YAML — Traits: crud, time-range, aggregation */
import type { FastifyInstance } from 'fastify';
import { Type, type TSchema } from '@sinclair/typebox';
import { ConversationEntitySchema } from '@flusk/entities';
import { ConversationRepository } from '@flusk/resources';
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TypeBox Type.Omit requires TObject cast
const CreateConversationSchema = Type.Omit(ConversationEntitySchema as any, ['id', 'createdAt', 'updatedAt']);
const ConversationResponseSchema = ConversationEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register Conversation routes
 */
export async function conversationRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateConversationSchema,
      response: { 201: ConversationResponseSchema as unknown as TSchema },
      tags: ['Conversation'],
      description: 'Create a new Conversation record',
    },
  }, async (request, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const created = ConversationRepository.createConversation(fastify.db, request.body as any);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: ConversationResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['Conversation'],
      description: 'Get a Conversation by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = ConversationRepository.findConversationById(fastify.db, id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(ConversationResponseSchema as unknown as TSchema) },
      tags: ['Conversation'],
      description: 'List Conversation records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = ConversationRepository.listConversations(fastify.db, limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateConversationSchema),
      response: { 200: ConversationResponseSchema as unknown as TSchema, 404: NotFoundSchema },
      tags: ['Conversation'],
      description: 'Update a Conversation by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- request body validated by schema
    const updated = ConversationRepository.updateConversation(fastify.db, id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['Conversation'],
      description: 'Delete a Conversation by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = ConversationRepository.deleteConversation(fastify.db, id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });

  /** Time-range query route for Conversation */
  fastify.get('/by-time-range', async (req) => {
    const { from, to } = req.query as { from: string; to: string };
    return ConversationRepository.findConversationsByTimeRange(fastify.db, from, to);
  });

  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as ConversationRepository.ConversationAggregateOptions; return ConversationRepository.aggregateConversations(fastify.db, opts); });
}