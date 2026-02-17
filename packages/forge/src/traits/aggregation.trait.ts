/**
 * Aggregation trait — generates countBy, sum, sumSince, and generic aggregate queries.
 *
 * WHY: Analytics entities need aggregate methods. This trait generates type-safe,
 * individual aggregation functions matching hand-written quality — with proper
 * return types, COALESCE for safe nulls, and snake_case SQL.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';
import { toSnakeCase, toPascalCase } from '../generators/utils.js';
import { placeholder } from './sql-helpers.js';
import type { StorageTarget } from '../schema/index.js';

/** Create the aggregation trait instance */
export function createAggregationTrait(): Trait {
  return {
    name: 'aggregation',
    description: 'Aggregate queries: countBy, sum, sumSince per field',
    dependencies: [],
    generate: (ctx: TraitContext): TraitOutput => generateAggregation(ctx),
  };
}

function buildCountBy(name: string, typeName: string, snakeCol: string, tableName: string, st: string, dbType: string, n: string): string[] {
  const lines: string[] = [];
  if (st === 'postgres') {
    lines.push(`/** Count ${n} records grouped by ${name} */`, `export async function countBy${toPascalCase(name)}(pool: ${dbType}): Promise<${typeName}[]> {`, `  const result = await pool.query('SELECT ${snakeCol}, COUNT(*) as count FROM ${tableName} GROUP BY ${snakeCol} ORDER BY count DESC');`, `  return result.rows as ${typeName}[];`, `}`);
  } else {
    lines.push(`/** Count ${n} records grouped by ${name} */`, `export function countBy${toPascalCase(name)}(db: ${dbType}): ${typeName}[] {`, `  const stmt = db.prepare('SELECT ${snakeCol}, COUNT(*) as count FROM ${tableName} GROUP BY ${snakeCol} ORDER BY count DESC');`, `  return stmt.all() as unknown as ${typeName}[];`, `}`);
  }
  return lines;
}

function buildSumFns(name: string, snakeCol: string, tableName: string, st: string, dbType: string, n: string): string[] {
  const pascal = toPascalCase(name);
  const p1 = placeholder(st as StorageTarget, 1);
  const lines: string[] = [];
  if (st === 'postgres') {
    lines.push(`/** Sum total ${name} of all ${n} records */`, `export async function sum${pascal}(pool: ${dbType}): Promise<number> {`, `  const result = await pool.query('SELECT COALESCE(SUM(${snakeCol}), 0) as total FROM ${tableName}');`, `  return (result.rows[0] as { total: number }).total;`, `}`, `/** Sum ${name} since a given ISO date */`, `export async function sum${pascal}Since(pool: ${dbType}, since: string): Promise<number> {`, `  const result = await pool.query('SELECT COALESCE(SUM(${snakeCol}), 0) as total FROM ${tableName} WHERE created_at >= ${p1}', [since]);`, `  return (result.rows[0] as { total: number }).total;`, `}`);
  } else {
    lines.push(`/** Sum total ${name} of all ${n} records */`, `export function sum${pascal}(db: ${dbType}): number {`, `  const stmt = db.prepare('SELECT COALESCE(SUM(${snakeCol}), 0) as total FROM ${tableName}');`, `  const row = stmt.get() as { total: number };`, `  return row.total;`, `}`, `/** Sum ${name} since a given ISO date */`, `export function sum${pascal}Since(db: ${dbType}, since: string): number {`, `  const stmt = db.prepare('SELECT COALESCE(SUM(${snakeCol}), 0) as total FROM ${tableName} WHERE created_at >= ${p1}');`, `  const row = stmt.get(since) as { total: number };`, `  return row.total;`, `}`);
  }
  return lines;
}

function buildGenericAggregate(n: string, tableName: string, st: string): string {
  if (st === 'postgres') {
    return `/** Run an aggregate query on ${n} */
export async function aggregate(pool: Pool, opts: ${n}AggregateOptions): Promise<${n}AggregateResult[]> {
  const col = opts.field.replace(/[^a-z_]/gi, ''); const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol ? \`\${groupCol} as "group", \${fn}(\${col}) as value\` : \`COALESCE(\${fn}(\${col}), 0) as value\`;
  const groupClause = groupCol ? \`GROUP BY \${groupCol}\` : '';
  const result = await pool.query(\`SELECT \${select} FROM ${tableName} \${groupClause}\`);
  return result.rows as ${n}AggregateResult[];
}`;
  }
  return `/** Run an aggregate query on ${n} */
export function aggregate${n}s(db: DatabaseSync, opts: ${n}AggregateOptions): ${n}AggregateResult[] {
  const col = opts.field.replace(/[^a-z_]/gi, ''); const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol ? \`\${groupCol} as "group", \${fn}(\${col}) as value\` : \`COALESCE(\${fn}(\${col}), 0) as value\`;
  const groupClause = groupCol ? \`GROUP BY \${groupCol}\` : '';
  return db.prepare(\`SELECT \${select} FROM ${tableName} \${groupClause}\`).all() as unknown as ${n}AggregateResult[];
}`;
}

/** Generate aggregation code sections */
function generateAggregation(ctx: TraitContext): TraitOutput {
  const { schema, storageTarget: st, tableName } = ctx;
  const n = schema.name;
  const dbType = st === 'postgres' ? 'Pool' : 'DatabaseSync';
  const dbImport = st === 'postgres' ? `import type { Pool } from 'pg';` : `import type { DatabaseSync } from 'node:sqlite';`;

  const numericFields = Object.entries(schema.fields).filter(([, f]) => f.type === 'number' || f.type === 'integer').map(([name]) => name);
  const indexedFields = Object.entries(schema.fields).filter(([, f]) => f.index === true).map(([name]) => name);
  const types: string[] = [];
  const functions: string[] = [];

  for (const name of indexedFields) {
    const typeName = `${n}${toPascalCase(name)}Count`;
    types.push(`export interface ${typeName} { ${name}: string; count: number; }`);
    functions.push(buildCountBy(name, typeName, toSnakeCase(name), tableName, st, dbType, n).join('\n'));
  }
  for (const name of numericFields) {
    functions.push(buildSumFns(name, toSnakeCase(name), tableName, st, dbType, n).join('\n'));
  }

  const numericUnion = numericFields.map((f) => `'${f}'`).join(' | ') || 'string';
  types.push(
    `export interface ${n}AggregateOptions { op: 'sum' | 'avg' | 'count' | 'min' | 'max'; field: ${numericUnion}; groupBy?: string; }`,
    `export interface ${n}AggregateResult { value: number; group?: string; }`,
  );
  functions.push(buildGenericAggregate(n, tableName, st));

  return {
    traitName: 'aggregation',
    repository: { imports: [dbImport], types, functions, sql: [], routes: [] },
    route: {
      imports: [],
      types: [],
      functions: [`  fastify.get('/aggregate', async (req) => { const opts = req.query as unknown as ${n}Repository.${n}AggregateOptions; return ${n}Repository.aggregate${n}s(fastify.db, opts); });`],
      sql: [], routes: [],
    },
    migration: emptySection(),
  };
}
