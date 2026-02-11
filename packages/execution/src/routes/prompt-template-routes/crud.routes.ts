import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PromptTemplateEntitySchema } from '@flusk/entities';
import { PromptTemplateRepository } from '@flusk/resources';
import { promptTemplate } from '@flusk/business-logic';

const CreateSchema = Type.Omit(PromptTemplateEntitySchema, ['id', 'createdAt', 'updatedAt']);

export async function promptTemplateCrudRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post('/', {
    schema: { body: CreateSchema, response: { 201: PromptTemplateEntitySchema } },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;
    const validation = promptTemplate.validatePromptTemplate(data);
    if (!validation.valid) return reply.code(400).send({ error: validation.errors.join(', ') });
    const created = await PromptTemplateRepository.create(data);
    return reply.code(201).send(created);
  });

  fastify.get('/:id', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entity = await PromptTemplateRepository.findById(request.params.id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.send(entity);
  });

  fastify.get('/org/:orgId', {
    schema: { params: Type.Object({ orgId: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { orgId: string } }>, reply: FastifyReply) => {
    const templates = await PromptTemplateRepository.findByOrganizationId(request.params.orgId);
    return reply.send(templates);
  });

  fastify.put('/:id', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const updated = await PromptTemplateRepository.update(request.params.id, request.body as any);
    if (!updated) return reply.code(404).send({ error: 'Not found' });
    return reply.send(updated);
  });

  fastify.delete('/:id', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    await PromptTemplateRepository.deleteById(request.params.id);
    return reply.code(204).send();
  });
}
