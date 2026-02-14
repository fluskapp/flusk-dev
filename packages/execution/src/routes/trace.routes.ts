/** @generated from Trace YAML — Traits: crud */
import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TraceEntitySchema } from '@flusk/entities';
import { TraceRepository } from '@flusk/resources';
const CreateTraceSchema = Type.Omit(TraceEntitySchema, ['id', 'createdAt', 'updatedAt']);
const TraceResponseSchema = TraceEntitySchema;
const IdParamsSchema = Type.Object({ id: Type.String({ format: 'uuid' }) });
const NotFoundSchema = Type.Object({ error: Type.String() });
const ListQuerySchema = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1 })),
  offset: Type.Optional(Type.Integer({ minimum: 0 })),
});

/**
 * Register Trace routes
 */
export async function traceRoutes(
  fastify: FastifyInstance,
): Promise<void> {
  fastify.post('/', {
    schema: {
      body: CreateTraceSchema,
      response: { 201: TraceResponseSchema },
      tags: ['Trace'],
      description: 'Create a new Trace record',
    },
  }, async (request, reply) => {
    const created = await TraceRepository.create(request.body);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 200: TraceResponseSchema, 404: NotFoundSchema },
      tags: ['Trace'],
      description: 'Get a Trace by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const entity = await TraceRepository.findById(id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(entity);
  });

  fastify.get('/', {
    schema: {
      querystring: ListQuerySchema,
      response: { 200: Type.Array(TraceResponseSchema) },
      tags: ['Trace'],
      description: 'List Trace records',
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query as { limit?: number; offset?: number };
    const items = await TraceRepository.list(limit, offset);
    return reply.code(200).send(items);
  });

  fastify.put('/:id', {
    schema: {
      params: IdParamsSchema,
      body: Type.Partial(CreateTraceSchema),
      response: { 200: TraceResponseSchema, 404: NotFoundSchema },
      tags: ['Trace'],
      description: 'Update a Trace by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const updated = await TraceRepository.update(id, request.body);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.code(200).send(updated);
  });

  fastify.delete('/:id', {
    schema: {
      params: IdParamsSchema,
      response: { 204: Type.Null(), 404: NotFoundSchema },
      tags: ['Trace'],
      description: 'Delete a Trace by ID',
    },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await TraceRepository.delete(id);
    if (!deleted) return reply.code(404).send({ error: 'Not found' });
    return reply.code(204).send();
  });
}

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---