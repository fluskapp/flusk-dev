import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingDecisionRepository } from '@flusk/resources';

export function registerGetSavings(fastify: FastifyInstance): void {
  fastify.get('/savings/:ruleId', {
    schema: { params: Type.Object({ ruleId: Type.String() }) },
  }, async (request) => {
    const { ruleId } = request.params as { ruleId: string };
    return RoutingDecisionRepository.getSavingsSummary(ruleId);
  });
}
