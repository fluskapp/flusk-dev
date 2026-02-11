import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PromptVersionRepository, PromptTemplateRepository } from '@flusk/resources';
import { promptVersion } from '@flusk/business-logic';

export async function promptVersionActionRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /prompt-versions/:id/activate
  fastify.post('/:id/activate', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const version = await PromptVersionRepository.findById(request.params.id);
    if (!version) return reply.code(404).send({ error: 'Version not found' });
    await PromptVersionRepository.update(version.id, { status: 'active' });
    await PromptTemplateRepository.update(version.templateId, { activeVersionId: version.id });
    return reply.send({ activated: true, versionId: version.id });
  });

  // POST /prompt-versions/:id/rollback
  fastify.post('/:id/rollback', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const current = await PromptVersionRepository.findById(request.params.id);
    if (!current) return reply.code(404).send({ error: 'Version not found' });
    const versions = await PromptVersionRepository.findByTemplateId(current.templateId);
    const previous = versions
      .filter((v) => v.version < current.version)
      .sort((a, b) => b.version - a.version)[0];
    if (!previous) return reply.code(400).send({ error: 'No previous version' });
    const decision = promptVersion.shouldRollback(current.metrics, previous.metrics);
    if (!decision.shouldRollback) {
      return reply.send({ rolledBack: false, reason: decision.reason });
    }
    await PromptVersionRepository.update(current.id, { status: 'rolled-back' });
    await PromptVersionRepository.update(previous.id, { status: 'active' });
    await PromptTemplateRepository.update(current.templateId, { activeVersionId: previous.id });
    return reply.send({ rolledBack: true, reason: decision.reason, newActiveVersionId: previous.id });
  });

  // PATCH /prompt-versions/:id/metrics
  fastify.patch('/:id/metrics', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      body: Type.Object({ quality: Type.Number(), latencyMs: Type.Number(), cost: Type.Number() }),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string }; Body: { quality: number; latencyMs: number; cost: number }
  }>, reply: FastifyReply) => {
    const version = await PromptVersionRepository.findById(request.params.id);
    if (!version) return reply.code(404).send({ error: 'Not found' });
    const { metrics } = version;
    const n = metrics.sampleCount;
    const newMetrics = {
      avgQuality: (metrics.avgQuality * n + request.body.quality) / (n + 1),
      avgLatencyMs: (metrics.avgLatencyMs * n + request.body.latencyMs) / (n + 1),
      avgCost: (metrics.avgCost * n + request.body.cost) / (n + 1),
      sampleCount: n + 1,
    };
    const updated = await PromptVersionRepository.update(version.id, { metrics: newMetrics });
    return reply.send(updated);
  });
}
