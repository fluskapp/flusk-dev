import type { DatabaseSync } from 'node:sqlite';
import type { PromptTemplateEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find PromptTemplate by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): PromptTemplateEntity | null {
  const stmt = db.prepare('SELECT * FROM prompt_templates WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
