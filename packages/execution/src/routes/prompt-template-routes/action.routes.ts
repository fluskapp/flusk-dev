import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PromptTemplateRepository, PromptVersionRepository } from '@flusk/resources';
import { promptTemplate, promptVersion } from '@flusk/business-logic';

export async function promptTemplateActionRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /prompt-templates/:id/render
  fastify.post('/:id/render', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      body: Type.Object({ variables: Type.Record(Type.String(), Type.String()) }),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string }; Body: { variables: Record<string, string> }
  }>, reply: FastifyReply) => {
    const template = await PromptTemplateRepository.findById(request.params.id);
    if (!template) return reply.code(404).send({ error: 'Template not found' });
    if (!template.activeVersionId) return reply.code(400).send({ error: 'No active version' });
    const version = await PromptVersionRepository.findById(template.activeVersionId);
    if (!version) return reply.code(404).send({ error: 'Active version not found' });
    const result = promptTemplate.renderPrompt(
      version.content, request.body.variables, template.variables
    );
    return reply.send({ ...result, versionId: version.id });
  });

  // POST /prompt-templates/:id/ab-test
  fastify.post('/:id/ab-test', {
    schema: {
      params: Type.Object({ id: Type.String({ format: 'uuid' }) }),
      body: Type.Object({
        candidateVersionId: Type.String({ format: 'uuid' }),
        trafficPercent: Type.Number({ minimum: 0, maximum: 100 }),
        variables: Type.Record(Type.String(), Type.String()),
      }),
    },
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { candidateVersionId: string; trafficPercent: number; variables: Record<string, string> }
  }>, reply: FastifyReply) => {
    const template = await PromptTemplateRepository.findById(request.params.id);
    if (!template?.activeVersionId) {
      return reply.code(400).send({ error: 'Template has no active version' });
    }
    const { body } = request;
    const abResult = promptVersion.selectABVariant(
      template.activeVersionId, body.candidateVersionId, body.trafficPercent
    );
    const version = await PromptVersionRepository.findById(abResult.selectedVersionId);
    if (!version) return reply.code(404).send({ error: 'Version not found' });
    const rendered = promptTemplate.renderPrompt(
      version.content, body.variables, template.variables
    );
    return reply.send({ ...abResult, ...rendered });
  });
}
