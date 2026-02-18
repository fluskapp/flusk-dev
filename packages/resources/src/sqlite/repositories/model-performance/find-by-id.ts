import type { DatabaseSync } from 'node:sqlite';
import type { ModelPerformanceEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ModelPerformance by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ModelPerformanceEntity | null {
  const stmt = db.prepare('SELECT * FROM model_performances WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
