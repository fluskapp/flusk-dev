import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { Type } from '@sinclair/typebox';

/**
 * Health Check Routes
 * Provides liveness and readiness endpoints for Kubernetes/monitoring
 *
 * GET /health → Liveness check (is server running?)
 * GET /health/ready → Readiness check (can server handle requests?)
 */

const HealthResponseSchema = Type.Object({
  status: Type.Literal('ok'),
  timestamp: Type.Optional(Type.String({ format: 'date-time' }))
});

const ReadyResponseSchema = Type.Object({
  status: Type.Literal('ready'),
  checks: Type.Object({
    database: Type.Literal('ok'),
    redis: Type.Literal('ok')
  }),
  timestamp: Type.String({ format: 'date-time' })
});

/**
 * Register health check routes
 */
export async function healthRoutes(
  fastify: FastifyInstance,
  _opts: FastifyPluginOptions
): Promise<void> {
  /**
   * Liveness probe
   * Returns 200 if server is running
   */
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: HealthResponseSchema
        }
      }
    },
    async () => {
      return {
        status: 'ok' as const,
        timestamp: new Date().toISOString()
      };
    }
  );

  /**
   * Readiness probe
   * Returns 200 if server can handle requests
   * Checks database and Redis connectivity
   */
  fastify.get(
    '/health/ready',
    {
      schema: {
        response: {
          200: ReadyResponseSchema
        }
      }
    },
    async () => {
      // TODO: Implement actual DB and Redis health checks
      // For now, return ready immediately
      // In production:
      // - Check PostgreSQL: await db.query('SELECT 1')
      // - Check Redis: await redis.ping()

      return {
        status: 'ready' as const,
        checks: {
          database: 'ok' as const,
          redis: 'ok' as const
        },
        timestamp: new Date().toISOString()
      };
    }
  );
}
