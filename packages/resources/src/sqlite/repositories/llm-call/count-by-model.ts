/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';

export interface ModelCount {
  model: string;
  count: number;
}

/**
 * Count LLM calls grouped by model
 */
export function countByModel(db: DatabaseSync): ModelCount[] {
  const stmt = db.prepare(
    'SELECT model, COUNT(*) as count FROM llm_calls GROUP BY model ORDER BY count DESC',
  );
  return stmt.all() as ModelCount[];
}
