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
import { buildCountBy, buildSumFns, buildGenericAggregate } from './aggregation-builders.js';

/** Create the aggregation trait instance */
export function createAggregationTrait(): Trait {
  return {
    name: 'aggregation',
    description: 'Aggregate queries: countBy, sum, sumSince per field',
    dependencies: [],
    generate: (ctx: TraitContext): TraitOutput => generateAggregation(ctx),
  };
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
