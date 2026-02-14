/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';
import type { AnalyzeSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List analyze sessions with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): AnalyzeSessionEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM analyze_sessions ORDER BY started_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
