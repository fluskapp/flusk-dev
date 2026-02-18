import type { DatabaseSync } from 'node:sqlite';
import type { PromptTemplateEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new PromptTemplate record
 */
export function create(
  db: DatabaseSync,
  data: Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>,
): PromptTemplateEntity {
  // TODO: implement INSERT for prompt_templates
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
