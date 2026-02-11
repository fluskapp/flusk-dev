import type { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { RoutingRuleRepository } from '@flusk/resources';

export function registerDeleteRule(fastify: FastifyInstance): void {
  fastify.delete('/:id', {
    schema: { params: Type.Object({ id: Type.String() }) },
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await RoutingRuleRepository.deleteById(id);
    if (!deleted) return reply.status(404).send({ error: 'Not found' });
    return reply.status(204).send();
  });
}
