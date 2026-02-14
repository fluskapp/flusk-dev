import type { FastifyInstance } from 'fastify';
import { ProfileSessionRepository } from '@flusk/resources';

/**
 * DELETE /v1/profiles/:id — delete a profile session
 */
export async function deleteProfileRoute(app: FastifyInstance): Promise<void> {
  app.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pool = app.pg.pool;

    const deleted = await ProfileSessionRepository.hardDelete(pool, id);
    if (!deleted) {
      return reply.status(404).send({ error: 'Profile session not found' });
    }

    return reply.status(204).send();
  });
}
