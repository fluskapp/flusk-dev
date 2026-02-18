import type { DatabaseSync } from 'node:sqlite';
import type { TraceEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new Trace record
 */
export function create(
  db: DatabaseSync,
  data: Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>,
): TraceEntity {
  // TODO: implement INSERT for traces
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
