import type { Pool } from 'pg';

/**
 * Delete conversion by ID
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the conversion to delete
 * @returns True if deleted, false if not found
 */
export async function deleteById(pool: Pool, id: string): Promise<boolean> {
  const query = 'DELETE FROM conversions WHERE id = $1';
  const result = await pool.query(query, [id]);

  return result.rowCount !== null && result.rowCount > 0;
}
