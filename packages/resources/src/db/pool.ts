/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Pool } from 'pg';
import { getLogger } from '@flusk/logger';

const logger = getLogger().child({ module: 'db-pool' });

/**
 * Shared PostgreSQL connection pool singleton
 * All repositories use this single pool instance
 */
let pool: Pool | null = null;

/**
 * Get or create the shared PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    pool.on('error', (err) => {
      logger.error({ err }, 'unexpected database error');
    });
  }
  return pool;
}

/**
 * Close database connection pool (for graceful shutdown)
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
