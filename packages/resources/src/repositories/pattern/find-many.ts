import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all patterns (with optional pagination)
 * @param pool - PostgreSQL connection pool
 * @param limit - Maximum number of results (default: 100)
 * @param offset - Number of results to skip (default: 0)
 */
export async function findMany(
  pool: Pool,
  limit: number = 100,
  offset: number = 0
): Promise<PatternEntity[]> {
  const query = `
    SELECT * FROM patterns
    ORDER BY total_cost DESC, occurrence_count DESC
    LIMIT $1 OFFSET $2
  `;

  const result = await pool.query(query, [limit, offset]);
  return result.rows.map(rowToEntity);
}
