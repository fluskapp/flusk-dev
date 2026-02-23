/**
 * CRUD operation builders — create, findById, list, update, delete.
 */

import type { FieldSchema, StorageTarget } from '../schema/index.js';
import { placeholder } from './sql-helpers.js';
import { toSnake } from './crud-builders-row.js';

/** Build create function */
export function buildCreate(
  n: string, t: string, fields: [string, FieldSchema][], st: StorageTarget,
): string {
  const cols = fields.map(([name]) => toSnake(name)).join(', ');
  const ph = fields.map((_, i) => placeholder(st, i + 1)).join(', ');
  const vals = fields.map(([name, field]) => {
    if (field.type === 'json' || field.type === 'array') {
      return !field.required
        ? `data.${name} != null ? JSON.stringify(data.${name}) : null`
        : `JSON.stringify(data.${name})`;
    }
    if (field.type === 'boolean') return `data.${name} ? 1 : 0`;
    if (!field.required) return `data.${name} ?? null`;
    return `data.${name}`;
  });
  return [
    `export function create${n}(db: DatabaseSync, data: Create${n}Input): ${n}Entity {`,
    `  const stmt = db.prepare(\`INSERT INTO ${t} (${cols}) VALUES (${ph}) RETURNING *\`);`,
    `  const row = stmt.get(${vals.join(', ')}) as Record<string, unknown>;`,
    `  return rowToEntity(row);`,
    `}`,
  ].join('\n');
}

/** Build findById function */
export function buildFindById(n: string, t: string, st: StorageTarget): string {
  return [
    `export function find${n}ById(db: DatabaseSync, id: string): ${n}Entity | null {`,
    `  const stmt = db.prepare('SELECT * FROM ${t} WHERE id = ${placeholder(st, 1)}');`,
    `  const row = stmt.get(id) as Record<string, unknown> | undefined;`,
    `  return row ? rowToEntity(row) : null;`,
    `}`,
  ].join('\n');
}

/** Build list function with pagination */
export function buildList(n: string, t: string, st: StorageTarget): string {
  return [
    `export function list${n}s(db: DatabaseSync, limit = 50, offset = 0): ${n}Entity[] {`,
    `  const stmt = db.prepare('SELECT * FROM ${t} ORDER BY created_at DESC LIMIT ${placeholder(st, 1)} OFFSET ${placeholder(st, 2)}');`,
    `  return (stmt.all(limit, offset) as Record<string, unknown>[]).map(rowToEntity);`,
    `}`,
  ].join('\n');
}

/** Build update function with dynamic SET and type conversions */
export function buildUpdate(n: string, t: string): string {
  return [
    `export function update${n}(db: DatabaseSync, id: string, data: Update${n}Input): ${n}Entity | null {`,
    `  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);`,
    `  if (keys.length === 0) return find${n}ById(db, id);`,
    `  const sets = keys.map((k) => \`\${toSnake(k)} = ?\`).join(', ');`,
    `  const vals = keys.map((k) => convertValueForDb(k, data[k as keyof typeof data]));`,
    `  const stmt = db.prepare(\`UPDATE ${t} SET \${sets} WHERE id = ? RETURNING *\`);`,
    `  const row = stmt.get(...(vals as (null | number | bigint | string)[]), id) as Record<string, unknown> | undefined;`,
    `  return row ? rowToEntity(row) : null;`,
    `}`,
  ].join('\n');
}

/** Build delete function */
export function buildDelete(n: string, t: string, st: StorageTarget): string {
  return [
    `export function delete${n}(db: DatabaseSync, id: string): boolean {`,
    `  const stmt = db.prepare('DELETE FROM ${t} WHERE id = ${placeholder(st, 1)}');`,
    `  return stmt.run(id).changes > 0;`,
    `}`,
  ].join('\n');
}
