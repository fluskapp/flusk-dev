import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingRuleRepository } from '@flusk/resources';

export function registerGetRules(fastify: FastifyInstance): void {
  fastify.get('/', {
    schema: { querystring: Type.Object({ organizationId: Type.String() }) },
  }, async (request) => {
    const { organizationId } = request.query as { organizationId: string };
    return RoutingRuleRepository.findByOrganization(organizationId);
  });
}
