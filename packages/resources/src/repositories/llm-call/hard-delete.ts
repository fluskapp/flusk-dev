import type { Pool } from 'pg';

/**
 * Hard delete LLM call record (GDPR compliance)
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the LLM call to delete
 * @returns true if deleted, false if not found
 */
export async function hardDelete(pool: Pool, id: string): Promise<boolean> {
  const query = 'DELETE FROM llm_calls WHERE id = $1';
  const result = await pool.query(query, [id]);

  return result.rowCount !== null && result.rowCount > 0;
}
