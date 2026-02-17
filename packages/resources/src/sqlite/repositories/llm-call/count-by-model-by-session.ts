// @generated
// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ModelCount } from './count-by-model.js';

/**
 * Count LLM calls grouped by model for a specific session
 */
export function countByModelBySessionId(db: DatabaseSync, sessionId: string): ModelCount[] {
  const stmt = db.prepare(
    'SELECT model, COUNT(*) as count FROM llm_calls WHERE session_id = ? GROUP BY model ORDER BY count DESC',
  );
  return stmt.all(sessionId) as unknown as ModelCount[];
}
// --- END GENERATED ---
