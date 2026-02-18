import type { DatabaseSync } from 'node:sqlite';
import type { PromptVersionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List PromptVersion records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): PromptVersionEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM prompt_versions ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
