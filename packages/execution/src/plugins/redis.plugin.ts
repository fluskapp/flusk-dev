/** @generated —
 * Redis plugin — wraps @fastify/redis for cache and pub/sub.
 * Decorates app with `app.redis`.
 */
import fp from 'fastify-plugin';
import fastifyRedis from '@fastify/redis';

export const plugin = fp(async (app) => {
  await app.register(fastifyRedis, {
    url: app.config.REDIS_URL,
    maxRetriesPerRequest: 3,
  });
}, { name: 'flusk-redis', dependencies: ['flusk-config'] });
