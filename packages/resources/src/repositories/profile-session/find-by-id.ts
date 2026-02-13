import type { Pool } from 'pg';
import { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find profile session by UUID
 */
export async function findById(
  pool: Pool,
  id: string
): Promise<ProfileSessionEntity | null> {
  const query = 'SELECT * FROM profile_sessions WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
