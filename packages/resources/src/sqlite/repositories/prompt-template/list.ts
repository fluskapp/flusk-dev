import type { DatabaseSync } from 'node:sqlite';
import type { PromptTemplateEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List PromptTemplate records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): PromptTemplateEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM prompt_templates ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
