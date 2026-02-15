/**
 * Migration SQL generator from YAML (SQLite + Postgres).
 * WHY: Keeps migrations in sync with entity YAML definitions.
 */
import { toSnakeCase, toTableName } from '../generators/utils.js';
import { SQLITE_TYPE_MAP } from './field-types.js';
import type { EntitySchema } from './entity-schema.types.js';
import type { FieldType } from './field-types.js';

type Dialect = 'sqlite' | 'postgres';

const PG_TYPE: Record<FieldType, string> = {
  string: 'TEXT', integer: 'INTEGER', number: 'DOUBLE PRECISION',
  boolean: 'BOOLEAN', uuid: 'UUID', date: 'TIMESTAMP WITH TIME ZONE',
  email: 'TEXT', enum: 'TEXT', reference: 'UUID', json: 'JSONB', array: 'JSONB',
};

const ID_COL: Record<Dialect, string> = {
  sqlite: "  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16))))",
  postgres: '  id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
};

function timestamps(d: Dialect): string[] {
  return d === 'postgres'
    ? ['  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()',
       '  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()']
    : ["  created_at TEXT NOT NULL DEFAULT (datetime('now'))",
       "  updated_at TEXT NOT NULL DEFAULT (datetime('now'))"];
}

function formatDefault(val: string | number | boolean, _ft: FieldType, d: Dialect): string {
  if (typeof val === 'boolean') return d === 'postgres' ? (val ? 'TRUE' : 'FALSE') : val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  if (typeof val === 'string') return `'${val.replace(/^"(.*)"$/, '$1')}'`;
  return String(val);
}

function buildColumns(schema: EntitySchema, dialect: Dialect): string[] {
  const typeMap = dialect === 'sqlite' ? SQLITE_TYPE_MAP : PG_TYPE;
  const cols = Object.entries(schema.fields).map(([name, field]) => {
    const parts = [`  ${toSnakeCase(name)} ${typeMap[field.type]}`];
    if (field.required) parts.push('NOT NULL');
    if (field.unique) parts.push('UNIQUE');
    if (field.default !== undefined) {
      parts.push(`DEFAULT ${formatDefault(field.default, field.type, dialect)}`);
    }
    return parts.join(' ');
  });
  return [...cols, ...timestamps(dialect)];
}

function buildForeignKeys(schema: EntitySchema): string[] {
  if (!schema.relations) return [];
  return Object.values(schema.relations)
    .filter((r) => r.type === 'belongs-to')
    .map((r) => {
      const fk = r.foreignKey ? toSnakeCase(r.foreignKey) : toSnakeCase(r.entity) + '_id';
      return `  FOREIGN KEY (${fk}) REFERENCES ${toTableName(toSnakeCase(r.entity))}(id)`;
    });
}

function buildIndexes(schema: EntitySchema, table: string): string[] {
  const idxs = Object.entries(schema.fields)
    .filter(([, f]) => f.index)
    .map(([name]) => {
      const col = toSnakeCase(name);
      return `CREATE INDEX IF NOT EXISTS idx_${table}_${col} ON ${table}(${col});`;
    });
  if (!idxs.some((i) => i.includes('created_at'))) {
    idxs.push(`CREATE INDEX IF NOT EXISTS idx_${table}_created_at ON ${table}(created_at);`);
  }
  return idxs;
}

function generate(schema: EntitySchema, dialect: Dialect): string {
  const table = toTableName(toSnakeCase(schema.name));
  const allCols = [ID_COL[dialect], ...buildColumns(schema, dialect), ...buildForeignKeys(schema)];
  const indexes = buildIndexes(schema, table);
  return [`CREATE TABLE IF NOT EXISTS ${table} (`, allCols.join(',\n'), ');', ...indexes].join('\n');
}

/** Generate SQLite migration SQL from an EntitySchema. */
export function generateMigrationSql(schema: EntitySchema): string {
  return generate(schema, 'sqlite');
}

/** Generate Postgres migration SQL from an EntitySchema. */
export function generatePostgresMigrationSql(schema: EntitySchema): string {
  return generate(schema, 'postgres');
}
