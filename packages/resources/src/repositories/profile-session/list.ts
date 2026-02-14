import type { Pool } from 'pg';
import { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List profile sessions with pagination
 */
export async function list(
  pool: Pool,
  limit = 50,
  offset = 0
): Promise<ProfileSessionEntity[]> {
  const query = `
    SELECT * FROM profile_sessions
    ORDER BY started_at DESC
    LIMIT $1 OFFSET $2
  `;
  const result = await pool.query(query, [limit, offset]);
  return result.rows.map(rowToEntity);
}
