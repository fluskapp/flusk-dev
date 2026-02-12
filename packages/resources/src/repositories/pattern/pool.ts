/**
 * @deprecated Pool is now injected via @fastify/postgres plugin.
 * This file is kept for backward compatibility during migration.
 */
export { getPool, closePool } from '../../db/pool.js';
