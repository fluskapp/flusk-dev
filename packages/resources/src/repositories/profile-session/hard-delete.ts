/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

/**
 * Hard delete profile session record
 */
export async function hardDelete(pool: Pool, id: string): Promise<boolean> {
  const query = 'DELETE FROM profile_sessions WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}
