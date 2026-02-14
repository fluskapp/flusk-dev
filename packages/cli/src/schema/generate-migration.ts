/**
 * SQLite migration SQL generator from YAML.
 *
 * WHY: Generates CREATE TABLE + indexes from entity YAML.
 * Ensures migrations stay in sync with the schema definition
 * instead of being hand-written and potentially diverging.
 */

import { toSnakeCase, toTableName } from '../generators/utils.js';
import { SQLITE_TYPE_MAP } from './field-types.js';
import type { EntitySchema } from './entity-schema.types.js';

/**
 * Generate SQLite migration SQL from an EntitySchema.
 * Includes CREATE TABLE, indexes, and foreign keys.
 */
export function generateMigrationSql(schema: EntitySchema): string {
  const table = toTableName(toSnakeCase(schema.name));
  const columns = buildColumns(schema);
  const fks = buildForeignKeys(schema);
  const indexes = buildIndexes(schema, table);

  const allCols = [
    ...baseColumns(),
    ...columns,
    ...fks,
  ].join(',\n');

  return [
    `CREATE TABLE IF NOT EXISTS ${table} (`,
    allCols,
    ');',
    ...indexes,
  ].join('\n');
}

/** Base entity columns (id, created_at, updated_at) */
function baseColumns(): string[] {
  return [
    "  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))",
    "  created_at TEXT NOT NULL DEFAULT (datetime('now'))",
    "  updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
  ];
}

/** Convert fields to SQL column definitions */
function buildColumns(schema: EntitySchema): string[] {
  return Object.entries(schema.fields).map(([name, field]) => {
    const col = toSnakeCase(name);
    const sqlType = SQLITE_TYPE_MAP[field.type];
    const parts = [`  ${col} ${sqlType}`];

    if (field.required) parts.push('NOT NULL');
    if (field.unique) parts.push('UNIQUE');
    if (field.default !== undefined) {
      const val = typeof field.default === 'string'
        ? `'${field.default}'` : String(field.default);
      parts.push(`DEFAULT ${val}`);
    }
    return parts.join(' ');
  });
}

/** Build FOREIGN KEY clauses from relations */
function buildForeignKeys(schema: EntitySchema): string[] {
  if (!schema.relations) return [];
  return Object.values(schema.relations)
    .filter((r) => r.type === 'belongs-to')
    .map((r) => {
      const fk = r.foreignKey
        ? toSnakeCase(r.foreignKey)
        : toSnakeCase(r.entity) + '_id';
      const target = toTableName(toSnakeCase(r.entity));
      return `  FOREIGN KEY (${fk}) REFERENCES ${target}(id)`;
    });
}

/** Build CREATE INDEX statements */
function buildIndexes(
  schema: EntitySchema,
  table: string,
): string[] {
  return Object.entries(schema.fields)
    .filter(([, f]) => f.index)
    .map(([name]) => {
      const col = toSnakeCase(name);
      return `CREATE INDEX IF NOT EXISTS idx_${table}_${col} ON ${table}(${col});`;
    });
}
