import type { DatabaseSync } from 'node:sqlite';
import type { SpanEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new Span record
 */
export function create(
  db: DatabaseSync,
  data: Omit<SpanEntity, 'id' | 'createdAt' | 'updatedAt'>,
): SpanEntity {
  // TODO: implement INSERT for spans
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
