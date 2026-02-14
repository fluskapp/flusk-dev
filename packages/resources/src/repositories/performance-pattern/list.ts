/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PerformancePatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List performance patterns with pagination
 */
export async function list(
  pool: Pool,
  limit = 50,
  offset = 0,
): Promise<PerformancePatternEntity[]> {
  const query = `
    SELECT * FROM performance_patterns
    ORDER BY created_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows.map(rowToEntity);
}
