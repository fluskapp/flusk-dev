import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';
import { generateEmbedding } from '@flusk/resources/clients/openai-embedding.client';

const DEFAULT_THRESHOLD = Number(process.env.VECTOR_SIMILARITY_THRESHOLD) || 0.95;
const DEFAULT_LIMIT = 20;

/**
 * POST /similar — search by prompt text using cosine similarity
 */
export function registerSearchSimilar(fastify: FastifyInstance): void {
  fastify.post(
    '/similar',
    {
      schema: {
        body: Type.Object({
          prompt: Type.String({ minLength: 1 }),
          threshold: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
          limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
        }),
        response: {
          200: Type.Object({
            results: Type.Array(
              Type.Object({
                id: Type.String(),
                prompt: Type.String(),
                model: Type.String(),
                similarity: Type.Number(),
                cost: Type.Number(),
              })
            ),
          }),
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (!process.env.OPENAI_API_KEY) {
        return reply.code(503).send({ error: 'Embeddings not configured' });
      }

      const { prompt, threshold, limit } = request.body as {
        prompt: string;
        threshold?: number;
        limit?: number;
      };

      const { embedding } = await generateEmbedding(prompt);
      const similar = await LLMCallRepository.findSimilar(
        embedding,
        threshold ?? DEFAULT_THRESHOLD,
        limit ?? DEFAULT_LIMIT
      );

      return reply.send({
        results: similar.map((s) => ({
          id: s.call.id,
          prompt: s.call.prompt,
          model: s.call.model,
          similarity: s.similarity,
          cost: s.call.cost,
        })),
      });
    }
  );
}
