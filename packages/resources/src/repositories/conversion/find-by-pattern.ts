/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all conversions for a specific pattern
 * @param pool - PostgreSQL connection pool
 * @param patternId - UUID of the pattern
 */
export async function findByPattern(
  pool: Pool,
  patternId: string
): Promise<ConversionEntity[]> {
  const query = `
    SELECT * FROM conversions
    WHERE pattern_id = $1
    ORDER BY created_at DESC
  `;

  const result = await pool.query(query, [patternId]);
  return result.rows.map(rowToEntity);
}
