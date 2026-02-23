/**
 * Delete file generator for multi-file CRUD.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { tbl, entityLabel } from './multi-file-crud-helpers.js';

/** Generate delete-by-id.ts */
export function generateDeleteById(schema: EntitySchema): string {
  const table = tbl(schema.name);
  const label = entityLabel(schema.name);
  return `import type { DatabaseSync } from 'node:sqlite';

/**
 * Delete ${label} by id
 */
export function deleteById(
  db: DatabaseSync,
  id: string,
): boolean {
  const stmt = db.prepare('DELETE FROM ${table} WHERE id = ?');
  return stmt.run(id).changes > 0;
}
`;
}
