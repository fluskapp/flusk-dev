/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { SpanEntitySchema } from '@flusk/entities';
import { SpanRepository } from '@flusk/resources';

const CreateBody = Type.Object({
  traceId: Type.String({ format: 'uuid' }),
  parentSpanId: Type.Optional(Type.Union([Type.String({ format: 'uuid' }), Type.Null()])),
  type: Type.Union([
    Type.Literal('llm'), Type.Literal('tool'),
    Type.Literal('retrieval'), Type.Literal('chain'),
  ]),
  name: Type.String(),
  input: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

const IdParams = Type.Object({ id: Type.String({ format: 'uuid' }) });
const TraceParams = Type.Object({ traceId: Type.String({ format: 'uuid' }) });

export async function spanRoutes(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.pg.pool;

  fastify.post('/', {
    schema: { body: CreateBody, response: { 201: SpanEntitySchema }, tags: ['Span'] },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const data = req.body as Record<string, unknown>;
    const span = await SpanRepository.create(pool, {
      ...data, parentSpanId: data.parentSpanId ?? null,
      output: null, cost: 0, tokens: 0, latencyMs: 0,
      status: 'running', startedAt: new Date().toISOString(),
      completedAt: null,
    });
    return reply.code(201).send(span);
  });

  fastify.get('/:id', {
    schema: { params: IdParams, tags: ['Span'] },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const span = await SpanRepository.findById(pool, req.params.id);
    if (!span) return reply.code(404).send({ error: 'Span not found' });
    return reply.send(span);
  });

  fastify.get('/trace/:traceId', {
    schema: { params: TraceParams, tags: ['Span'] },
  }, async (req: FastifyRequest<{ Params: { traceId: string } }>, reply) => {
    const spans = await SpanRepository.findByTrace(pool, req.params.traceId);
    return reply.send(spans);
  });

  fastify.post('/:id/complete', {
    schema: {
      params: IdParams,
      body: Type.Object({
        output: Type.Optional(Type.Union([Type.String(), Type.Null()])),
        cost: Type.Number(),
        tokens: Type.Number(),
      }),
      tags: ['Span'],
    },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const { output, cost, tokens } = req.body as { output?: string; cost?: number; tokens?: Record<string, unknown> };
    const existing = await SpanRepository.findById(pool, req.params.id);
    if (!existing) return reply.code(404).send({ error: 'Span not found' });
    const now = new Date().toISOString();
    const latencyMs = new Date(now).getTime() - new Date(existing.startedAt).getTime();
    const span = await SpanRepository.update(pool, req.params.id, {
      output, cost, tokens, latencyMs, status: 'completed', completedAt: now,
    });
    return reply.send(span);
  });
}
