/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update conversion status (accept or reject)
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the conversion to update
 * @param status - New status ('accepted' or 'rejected')
 */
export async function updateStatus(
  pool: Pool,
  id: string,
  status: 'accepted' | 'rejected'
): Promise<ConversionEntity | null> {
  const query = `
    UPDATE conversions
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await pool.query(query, [status, id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
