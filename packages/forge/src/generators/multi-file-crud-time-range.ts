/**
 * Time-range query generator for multi-file repos.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { tbl } from './multi-file-crud-helpers.js';

/** Generate find-by-time-range.ts */
export function generateFindByTimeRange(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema.name);
  const col = schema.fields['startedAt'] ? 'started_at' : 'created_at';
  return `import type { DatabaseSync } from 'node:sqlite';
import type { ${n}Entity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ${n} records within a time range
 */
export function findByTimeRange(
  db: DatabaseSync,
  from: string,
  to: string,
): ${n}Entity[] {
  const stmt = db.prepare(
    'SELECT * FROM ${table} WHERE ${col} >= ? AND ${col} <= ? ORDER BY ${col} DESC',
  );
  const rows = stmt.all(from, to) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
`;
}
