import type { FastifyInstance } from 'fastify';
import { ProfileSessionRepository } from '@flusk/resources';

/**
 * GET /v1/profiles/:id — get a single profile session
 */
export async function getProfileRoute(app: FastifyInstance): Promise<void> {
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pool = app.pg.pool;

    const profile = await ProfileSessionRepository.findById(pool, id);
    if (!profile) {
      return reply.status(404).send({ error: 'Profile session not found' });
    }

    return reply.send(profile);
  });
}
