import type { DatabaseSync } from 'node:sqlite';
import type { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List LLM calls filtered by session ID
 */
export function listBySessionId(
  db: DatabaseSync,
  sessionId: string,
  limit = 10_000,
  offset = 0,
): LLMCallEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM llm_calls WHERE session_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(sessionId, limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
