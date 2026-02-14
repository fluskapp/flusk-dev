import type { DatabaseSync } from 'node:sqlite';
import type { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find Profile session by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ProfileSessionEntity | null {
  const stmt = db.prepare('SELECT * FROM profile_sessions WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
