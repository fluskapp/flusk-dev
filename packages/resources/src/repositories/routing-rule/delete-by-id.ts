/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

export async function deleteById(pool: Pool, id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM routing_rules WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
