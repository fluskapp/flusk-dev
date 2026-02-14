/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find pattern by UUID
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the pattern
 */
export async function findById(
  pool: Pool,
  id: string
): Promise<PatternEntity | null> {
  const query = 'SELECT * FROM patterns WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
