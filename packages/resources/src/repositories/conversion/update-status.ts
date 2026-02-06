import { ConversionEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update conversion status (accept or reject)
 * @param id - UUID of the conversion to update
 * @param status - New status ('accepted' or 'rejected')
 * @returns Updated conversion entity or null if not found
 */
export async function updateStatus(
  id: string,
  status: 'accepted' | 'rejected'
): Promise<ConversionEntity | null> {
  const db = getPool();

  const query = `
    UPDATE conversions
    SET status = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;

  const result = await db.query(query, [status, id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
