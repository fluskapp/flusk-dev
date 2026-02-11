import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { TraceEntitySchema } from '@flusk/entities';
import * as TraceRepository from '@flusk/resources/repositories/trace';
import * as SpanRepository from '@flusk/resources/repositories/span';
import { trace as traceBL } from '@flusk/business-logic';

const CreateBody = Type.Object({
  organizationId: Type.String({ format: 'uuid' }),
  name: Type.String(),
});

const IdParams = Type.Object({ id: Type.String({ format: 'uuid' }) });
const OrgParams = Type.Object({ organizationId: Type.String({ format: 'uuid' }) });

export async function traceRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', {
    schema: { body: CreateBody, response: { 201: TraceEntitySchema }, tags: ['Trace'] },
  }, async (req: FastifyRequest, reply: FastifyReply) => {
    const { organizationId, name } = req.body as any;
    const trace = await TraceRepository.create({
      organizationId, name, totalCost: 0, totalTokens: 0,
      totalLatencyMs: 0, callCount: 0, status: 'running',
      startedAt: new Date().toISOString(), completedAt: null,
    });
    return reply.code(201).send(trace);
  });

  fastify.get('/:id', {
    schema: { params: IdParams, tags: ['Trace'] },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const trace = await TraceRepository.findById(req.params.id);
    if (!trace) return reply.code(404).send({ error: 'Trace not found' });
    return reply.send(trace);
  });

  fastify.get('/organization/:organizationId', {
    schema: { params: OrgParams, tags: ['Trace'] },
  }, async (req: FastifyRequest<{ Params: { organizationId: string } }>, reply) => {
    const traces = await TraceRepository.findByOrganization(req.params.organizationId);
    return reply.send(traces);
  });

  fastify.post('/:id/complete', {
    schema: { params: IdParams, tags: ['Trace'] },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const spans = await SpanRepository.findByTrace(req.params.id);
    const stats = traceBL.aggregateTraceStats(spans);
    const trace = await TraceRepository.updateStats(req.params.id, stats);
    if (!trace) return reply.code(404).send({ error: 'Trace not found' });
    return reply.send(trace);
  });

  fastify.get('/:id/waterfall', {
    schema: { params: IdParams, tags: ['Trace'] },
  }, async (req: FastifyRequest<{ Params: { id: string } }>, reply) => {
    const spans = await SpanRepository.findByTrace(req.params.id);
    return reply.send(spans);
  });
}
