import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { ModelPerformanceRepository } from '@flusk/resources';

export function registerGetPerformance(fastify: FastifyInstance): void {
  fastify.get('/performance', {
    schema: {
      querystring: Type.Object({
        promptCategory: Type.Optional(Type.String()),
      }),
    },
  }, async (request) => {
    const { promptCategory } = request.query as { promptCategory?: string };
    return ModelPerformanceRepository.findByCategory(fastify.pg.pool, promptCategory);
  });
}
