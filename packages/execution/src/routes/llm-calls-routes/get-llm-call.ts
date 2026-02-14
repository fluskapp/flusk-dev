/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import { LLMCallRepository } from '@flusk/resources';
import { LLMCallResponseSchema } from './schemas.js';

/**
 * GET /llm-calls/:id
 * Retrieve LLM call by UUID
 */
export function registerGetLLMCall(fastify: FastifyInstance): void {
  fastify.get(
    '/:id',
    {
      schema: {
        params: Type.Object({
          id: Type.String({ format: 'uuid' })
        }),
        response: {
          200: LLMCallResponseSchema,
          404: Type.Object({
            error: Type.String()
          })
        },
        tags: ['LLM Calls'],
        description: 'Get LLM call by ID'
      }
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;

      const llmCall = await LLMCallRepository.findById(fastify.pg.pool, id);

      if (!llmCall) {
        return reply.code(404).send({ error: 'LLM call not found' });
      }

      return reply.code(200).send(llmCall);
    }
  );
}
