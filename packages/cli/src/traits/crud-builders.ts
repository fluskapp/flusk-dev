/**
 * Builder functions for CRUD trait code generation.
 *
 * WHY: Extracted from crud.trait.ts to keep each file under 150 lines.
 * Each builder produces a string of generated TypeScript code.
 */

import type { FieldSchema, StorageTarget } from '../schema/index.js';
import { placeholder } from './sql-helpers.js';

/** Convert camelCase to snake_case */
export function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Build a single field mapping line for rowToEntity */
function buildFieldMapping(camel: string, snake: string, field: FieldSchema): string {
  const opt = !field.required;
  if (field.type === 'json' || field.type === 'array') {
    return opt
      ? `${camel}: row.${snake} != null ? JSON.parse(row.${snake} as string) : undefined,`
      : `${camel}: JSON.parse(row.${snake} as string),`;
  }
  if (field.type === 'boolean') {
    return opt
      ? `${camel}: row.${snake} != null ? Boolean(row.${snake}) : undefined,`
      : `${camel}: Boolean(row.${snake}),`;
  }
  if (field.type === 'date') {
    return opt
      ? `${camel}: row.${snake} != null ? toISOString(row.${snake}) : undefined,`
      : `${camel}: toISOString(row.${snake}),`;
  }
  const cast = field.type === 'number' || field.type === 'integer' ? 'number' : 'string';
  return opt
    ? `${camel}: (row.${snake} as ${cast}) ?? undefined,`
    : `${camel}: row.${snake} as ${cast},`;
}

/** Build rowToEntity mapper with proper type conversions */
export function buildRowToEntity(n: string, fields: [string, FieldSchema][]): string {
  const mappings = [
    `    id: row.id as string,`,
    `    createdAt: toISOString(row.created_at),`,
    `    updatedAt: toISOString(row.updated_at),`,
    ...fields.map(([name, field]) => `    ${buildFieldMapping(name, toSnake(name), field)}`),
  ];
  return [
    `function toISOString(value: unknown): string {`,
    `  if (typeof value === 'string') return value;`,
    `  if (value && typeof value === 'object' && 'toISOString' in value) {`,
    `    return (value as { toISOString(): string }).toISOString();`,
    `  }`,
    `  return String(value);`,
    `}`,
    ``,
    `/** Convert a SQLite row (snake_case) to ${n}Entity (camelCase) */`,
    `function rowToEntity(row: Record<string, unknown>): ${n}Entity {`,
    `  return {`,
    ...mappings,
    `  };`,
    `}`,
  ].join('\n');
}

/** Build toSnake + convertValueForDb helpers for generated code */
export function buildHelpers(fields: [string, FieldSchema][]): string {
  const jsonF = fields.filter(([, f]) => f.type === 'json' || f.type === 'array').map(([n]) => `'${n}'`);
  const boolF = fields.filter(([, f]) => f.type === 'boolean').map(([n]) => `'${n}'`);
  const checks: string[] = [];
  if (jsonF.length > 0) checks.push(`  if (new Set([${jsonF.join(', ')}]).has(key)) return JSON.stringify(value);`);
  if (boolF.length > 0) checks.push(`  if (new Set([${boolF.join(', ')}]).has(key)) return value ? 1 : 0;`);
  return [
    `function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }`,
    `function convertValueForDb(key: string, value: unknown): unknown {`,
    ...checks,
    `  return value ?? null;`,
    `}`,
  ].join('\n');
}

/** Build create function */
export function buildCreate(n: string, t: string, fields: [string, FieldSchema][], st: StorageTarget): string {
  const cols = fields.map(([name]) => toSnake(name)).join(', ');
  const ph = fields.map((_, i) => placeholder(st, i + 1)).join(', ');
  const vals = fields.map(([name, field]) => {
    if (field.type === 'json' || field.type === 'array') return `JSON.stringify(data.${name})`;
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
    `  const row = stmt.get(...vals, id) as Record<string, unknown> | undefined;`,
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

/** Build CRUD route section */
export function buildCrudRoutes(n: string, camel: string): import('./trait.types.js').TraitCodeSection {
  return {
    imports: [`import { ${n}EntitySchema } from '@flusk/types';`],
    types: [],
    functions: [
      `export function register${n}CrudRoutes(app: FastifyInstance): void {`,
      `  app.get('/${camel}s', async (req) => list${n}s(req.db));`,
      `  app.get('/${camel}s/:id', async (req) => find${n}ById(req.db, req.params.id));`,
      `  app.post('/${camel}s', async (req) => create${n}(req.db, req.body));`,
      `  app.put('/${camel}s/:id', async (req) => update${n}(req.db, req.params.id, req.body));`,
      `  app.delete('/${camel}s/:id', async (req) => delete${n}(req.db, req.params.id));`,
      `}`,
    ],
    sql: [],
    routes: [],
  };
}
