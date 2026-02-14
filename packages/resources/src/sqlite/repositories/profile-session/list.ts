import type { DatabaseSync } from 'node:sqlite';
import type { ProfileSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List profile sessions with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ProfileSessionEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM profile_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
