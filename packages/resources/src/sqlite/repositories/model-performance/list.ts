import type { DatabaseSync } from 'node:sqlite';
import type { ModelPerformanceEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List ModelPerformance records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ModelPerformanceEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM model_performances ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
