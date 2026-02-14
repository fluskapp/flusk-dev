import type { DatabaseSync } from 'node:sqlite';
import type { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find conversions for a specific pattern
 */
export function findByPattern(
  db: DatabaseSync, patternId: string,
): ConversionEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM conversions WHERE pattern_id = ?',
  );
  const rows = stmt.all(patternId) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
