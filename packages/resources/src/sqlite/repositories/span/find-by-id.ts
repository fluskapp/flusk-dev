import type { DatabaseSync } from 'node:sqlite';
import type { SpanEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find Span by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): SpanEntity | null {
  const stmt = db.prepare('SELECT * FROM spans WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
