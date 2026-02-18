import type { DatabaseSync } from 'node:sqlite';
import type { OptimizationEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new Optimization record
 */
export function create(
  db: DatabaseSync,
  data: Omit<OptimizationEntity, 'id' | 'createdAt' | 'updatedAt'>,
): OptimizationEntity {
  // TODO: implement INSERT for optimizations
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
