/**
 * Read file generators (findById, list) for multi-file CRUD.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { tbl, entityLabel } from './multi-file-crud-helpers.js';

/** Generate find-by-id.ts */
export function generateFindById(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema.name);
  const label = entityLabel(n);
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Find ${label} by id\n */\nexport function findById(\n  db: DatabaseSync,\n  id: string,\n): ${n}Entity | null {\n  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');\n  const row = stmt.get(id) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`;
}

/** Generate list.ts */
export function generateList(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema.name);
  const orderCol = schema.fields['startedAt'] ? 'started_at' : 'created_at';
  const label = entityLabel(n);
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * List ${label}s with pagination\n */\nexport function list(\n  db: DatabaseSync,\n  limit = 50,\n  offset = 0,\n): ${n}Entity[] {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} ORDER BY ${orderCol} DESC LIMIT ? OFFSET ?',\n  );\n  const rows = stmt.all(limit, offset) as Record<string, unknown>[];\n  return rows.map(rowToEntity);\n}\n`;
}
