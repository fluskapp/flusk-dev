import type { DatabaseSync } from 'node:sqlite';

/**
 * Sum cost of LLM calls since a given date
 */
export function sumCostSince(db: DatabaseSync, since: string): number {
  const stmt = db.prepare(
    'SELECT COALESCE(SUM(cost), 0) as total FROM llm_calls WHERE created_at >= ?',
  );
  const row = stmt.get(since) as { total: number };
  return row.total;
}
