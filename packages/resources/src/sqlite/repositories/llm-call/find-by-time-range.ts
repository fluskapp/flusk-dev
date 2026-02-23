import type { DatabaseSync } from 'node:sqlite';
import type { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find LLMCall records within a time range
 */
export function findByTimeRange(
  db: DatabaseSync,
  from: string,
  to: string,
): LLMCallEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM llm_calls WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC',
  );
  const rows = stmt.all(from, to) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
