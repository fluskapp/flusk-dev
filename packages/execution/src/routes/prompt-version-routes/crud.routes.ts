/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { PromptVersionEntitySchema } from '@flusk/entities';
import { PromptVersionRepository } from '@flusk/resources';
import { promptVersion } from '@flusk/business-logic';

export async function promptVersionCrudRoutes(fastify: FastifyInstance): Promise<void> {
  const pool = fastify.pg.pool;

  fastify.post('/', {
    schema: {
      body: Type.Object({
        templateId: Type.String({ format: 'uuid' }),
        content: Type.String(),
        status: Type.Optional(Type.String()),
      }),
      response: { 201: PromptVersionEntitySchema },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as Record<string, unknown>;
    const validation = promptVersion.validatePromptVersion(data);
    if (!validation.valid) return reply.code(400).send({ error: validation.errors.join(', ') });
    const created = await PromptVersionRepository.create(pool, data);
    return reply.code(201).send(created);
  });

  fastify.get('/template/:templateId', {
    schema: { params: Type.Object({ templateId: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { templateId: string } }>, reply: FastifyReply) => {
    const versions = await PromptVersionRepository.findByTemplateId(pool, request.params.templateId);
    return reply.send(versions);
  });

  fastify.get('/:id', {
    schema: { params: Type.Object({ id: Type.String({ format: 'uuid' }) }) },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const entity = await PromptVersionRepository.findById(pool, request.params.id);
    if (!entity) return reply.code(404).send({ error: 'Not found' });
    return reply.send(entity);
  });
}
