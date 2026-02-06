import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';
import {
  hashPromptHook,
  checkCacheHook,
  calculateCostHook,
  cacheResponseHook
} from '../../hooks/llm-call.hooks.js';
import { CreateLLMCallSchema, LLMCallResponseSchema, CachedResponseSchema } from './schemas.js';

/**
 * POST /llm-calls
 * Create new LLM call record
 * Hooks: hashPrompt → checkCache → calculateCost → cacheResponse
 */
export function registerCreateLLMCall(fastify: FastifyInstance): void {
  fastify.post(
    '/',
    {
      schema: {
        body: CreateLLMCallSchema,
        response: {
          201: LLMCallResponseSchema,
          200: CachedResponseSchema
        },
        tags: ['LLM Calls'],
        description: 'Create a new LLM call record or return cached response'
      },
      preHandler: [hashPromptHook, checkCacheHook, calculateCostHook],
      onSend: [cacheResponseHook]
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      // At this point, hooks have:
      // 1. Hashed the prompt
      // 2. Checked cache (and returned early if found)
      // 3. Calculated cost
      // 4. Prepared llmCallData

      const llmCallData = (request as any).llmCallData;

      if (!llmCallData) {
        return reply.code(400).send({ error: 'Invalid request data' });
      }

      // Create database record
      const created = await LLMCallRepository.create(llmCallData);

      return reply.code(201).send(created);
    }
  );
}
