import type { DatabaseSync } from 'node:sqlite';
import type { AnalyzeSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find analyze session by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): AnalyzeSessionEntity | null {
  const stmt = db.prepare('SELECT * FROM analyze_sessions WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
