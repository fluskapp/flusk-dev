import type { DatabaseSync } from 'node:sqlite';
import type { PromptVersionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new PromptVersion record
 */
export function create(
  db: DatabaseSync,
  data: Omit<PromptVersionEntity, 'id' | 'createdAt' | 'updatedAt'>,
): PromptVersionEntity {
  // TODO: implement INSERT for prompt_versions
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
