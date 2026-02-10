import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';
import { generateEmbedding } from '@flusk/resources/clients/openai-embedding.client';

/**
 * POST /backfill-embeddings — generate missing embeddings
 */
export function registerBackfillEmbeddings(fastify: FastifyInstance): void {
  fastify.post(
    '/backfill-embeddings',
    {
      schema: {
        body: Type.Object({
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 500 })),
        }),
        response: {
          200: Type.Object({
            processed: Type.Integer(),
            errors: Type.Integer(),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!process.env.OPENAI_API_KEY) {
        return reply.code(503).send({ error: 'Embeddings not configured' });
      }

      const { limit } = request.body as { limit?: number };
      const calls = await LLMCallRepository.findWithoutEmbedding(limit ?? 100);

      let processed = 0;
      let errors = 0;

      for (const call of calls) {
        try {
          const { embedding } = await generateEmbedding(call.prompt);
          await LLMCallRepository.updateEmbedding(call.id, embedding);
          processed++;
        } catch {
          errors++;
        }
      }

      return reply.send({ processed, errors });
    }
  );
}
