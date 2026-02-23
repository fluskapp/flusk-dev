/**
 * SQLite repository CRUD templates — create, findById, list.
 */

export function createTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new ${pascal} record
 */
export function create(
  db: DatabaseSync,
  data: Omit<${pascal}Entity, 'id' | 'createdAt' | 'updatedAt'>,
): ${pascal}Entity {
  // TODO: implement INSERT for ${table}
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
`;
}

export function findByIdTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ${pascal} by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ${pascal}Entity | null {
  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
`;
}

export function listTpl(pascal: string, table: string): string {
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${pascal}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List ${pascal} records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ${pascal}Entity[] {
  const stmt = db.prepare(
    'SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
`;
}
