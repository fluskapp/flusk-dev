/** @generated —
 * PostgreSQL plugin — wraps @fastify/postgres for connection lifecycle management.
 * Decorates app with `app.pg` (pool + query helpers).
 */
import fp from 'fastify-plugin';
import fastifyPostgres from '@fastify/postgres';

export const plugin = fp(async (app) => {
  await app.register(fastifyPostgres, {
    connectionString: app.config.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}, { name: 'flusk-postgres', dependencies: ['flusk-config'] });
