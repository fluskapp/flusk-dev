/** @generated —
 * Sensible + Under Pressure plugin — httpErrors helpers and backpressure/health.
 */
import fp from 'fastify-plugin';
import sensible from '@fastify/sensible';
import underPressure from '@fastify/under-pressure';

export const plugin = fp(async (app) => {
  await app.register(sensible);
  await app.register(underPressure, {
    maxEventLoopDelay: 1000,
    maxHeapUsedBytes: 1_000_000_000,
    maxRssBytes: 1_500_000_000,
    healthCheck: async () => {
      await app.pg.query('SELECT 1');
      await app.redis.ping();
      return true;
    },
    healthCheckInterval: 5000,
    exposeStatusRoute: '/health/live',
  });
}, {
  name: 'flusk-sensible',
  dependencies: ['flusk-postgres', 'flusk-redis'],
});
