import type { FastifyInstance } from 'fastify';
import {
  ProfileSessionRepository,
  PerformancePatternRepository,
} from '@flusk/resources';
import { profileSession } from '@flusk/business-logic';

/**
 * GET /v1/profiles/:id/suggestions — scored suggestions + patterns
 */
export async function getSuggestionsRoute(
  app: FastifyInstance,
): Promise<void> {
  app.get('/:id/suggestions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const pool = app.pg.pool;

    const session = await ProfileSessionRepository.findById(pool, id);
    if (!session) {
      return reply.status(404).send({ error: 'Profile session not found' });
    }

    const correlations = await profileSession.correlateWithTraces(
      pool,
      session,
    );
    const suggestions = profileSession.generateProfileSuggestions(
      session,
      correlations,
    );

    const previousSessions = await ProfileSessionRepository.list(
      pool,
      10,
      0,
    );
    const previous = previousSessions.filter((s) => s.id !== session.id);

    const patterns = profileSession.detectPatterns(
      session,
      correlations,
      previous,
    );

    const scored = profileSession.scoreSuggestions(suggestions, patterns);

    // Persist detected patterns for historical querying
    for (const p of patterns) {
      await PerformancePatternRepository.create(pool, {
        profileSessionId: session.id,
        pattern: p.pattern,
        severity: p.severity,
        description: p.description,
        suggestion: p.suggestion,
        metadata: p.metadata,
        organizationId: session.organizationId,
      });
    }

    return reply.send({ suggestions: scored, patterns });
  });
}
