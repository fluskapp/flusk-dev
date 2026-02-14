import type { DatabaseSync } from 'node:sqlite';
import type { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all accepted conversions
 */
export function findAccepted(
  db: DatabaseSync,
): ConversionEntity[] {
  const stmt = db.prepare(
    "SELECT * FROM conversions WHERE status = 'accepted'",
  );
  const rows = stmt.all() as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
