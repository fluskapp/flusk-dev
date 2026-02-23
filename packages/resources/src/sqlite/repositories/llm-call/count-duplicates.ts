import type { DatabaseSync } from 'node:sqlite';

/**
 * Count LLM calls sharing prompt_hash with others
 */
export function countDuplicates(db: DatabaseSync): number {
  const stmt = db.prepare(`
    SELECT COALESCE(SUM(cnt), 0) as total FROM (
      SELECT COUNT(*) as cnt FROM llm_calls
      GROUP BY prompt_hash HAVING COUNT(*) > 1
    )
  `);
  const row = stmt.get() as { total: number };
  return row.total;
}
