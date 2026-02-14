/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

/**
 * Hard delete performance pattern record
 */
export async function hardDelete(
  pool: Pool,
  id: string,
): Promise<boolean> {
  const query = 'DELETE FROM performance_patterns WHERE id = $1';
  const result = await pool.query(query, [id]);
  return result.rowCount !== null && result.rowCount > 0;
}
