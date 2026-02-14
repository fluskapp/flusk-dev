/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';
import type { PerformancePatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List performance patterns with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): PerformancePatternEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM performance_patterns ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
