import type { FastifyInstance } from 'fastify';
import { ProfileSessionRepository } from '@flusk/resources';
import { profileSession } from '@flusk/business-logic';

/**
 * GET /v1/profiles/:id/correlations — get correlated LLM calls
 */
export async function getCorrelationsRoute(app: FastifyInstance): Promise<void> {
  app.get('/:id/correlations', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pool = app.pg.pool;

    const session = await ProfileSessionRepository.findById(pool, id);
    if (!session) {
      return reply.status(404).send({ error: 'Profile session not found' });
    }

    const correlations = await profileSession.correlateWithTraces(pool, session);
    const suggestions = profileSession.generateProfileSuggestions(session, correlations);

    return reply.send({ correlations, suggestions });
  });
}
