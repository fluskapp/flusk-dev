/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { DatabaseSync } from 'node:sqlite';
import type { PerformancePatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all performance patterns for a profile session
 */
export function findByProfileId(
  db: DatabaseSync,
  profileSessionId: string,
): PerformancePatternEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM performance_patterns WHERE profile_session_id = ? ORDER BY severity ASC, created_at DESC',
  );
  const rows = stmt.all(profileSessionId) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
