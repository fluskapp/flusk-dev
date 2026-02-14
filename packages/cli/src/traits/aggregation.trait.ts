/** @generated —
 * Aggregation trait — generates sum, avg, count, groupBy queries.
 *
 * WHY: Analytics entities need aggregate methods. This trait
 * generates type-safe aggregation functions that work with
 * both SQLite and Postgres SQL dialects.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';

/** Supported aggregation functions */
export type AggregateOp = 'sum' | 'avg' | 'count' | 'min' | 'max';

/** Create the aggregation trait instance */
export function createAggregationTrait(): Trait {
  return {
    name: 'aggregation',
    description: 'Aggregate queries: sum, avg, count, groupBy',
    dependencies: [],
    generate: (ctx: TraitContext): TraitOutput => generateAggregation(ctx),
  };
}

/** Generate aggregation code sections */
function generateAggregation(ctx: TraitContext): TraitOutput {
  const { schema, tableName, camelName } = ctx;
  const n = schema.name;
  const numericFields = Object.entries(schema.fields)
    .filter(([, f]) => f.type === 'number' || f.type === 'integer')
    .map(([name]) => name);

  return {
    traitName: 'aggregation',
    repository: {
      imports: [
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [
        `/** Aggregation options for ${n} */`,
        `export interface ${n}AggregateOptions {`,
        `  op: 'sum' | 'avg' | 'count' | 'min' | 'max';`,
        `  field: ${numericFields.map((f) => `'${f}'`).join(' | ') || 'string'};`,
        `  groupBy?: string;`,
        `}`,
        `/** Aggregation result row */`,
        `export interface ${n}AggregateResult {`,
        `  value: number;`,
        `  group?: string;`,
        `}`,
      ],
      functions: [
        `/** Run an aggregate query on ${n} */
export function aggregate${n}s(
  db: DatabaseSync, opts: ${n}AggregateOptions,
): ${n}AggregateResult[] {
  const col = opts.field.replace(/[^a-z_]/gi, '');
  const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol
    ? \`\${groupCol} as "group", \${fn}(\${col}) as value\`
    : \`\${fn}(\${col}) as value\`;
  const groupClause = groupCol ? \`GROUP BY \${groupCol}\` : '';
  const sql = \`SELECT \${select} FROM ${tableName} \${groupClause}\`;
  return db.prepare(sql).all() as ${n}AggregateResult[];
}`,
      ],
      sql: [],
      routes: [],
    },
    route: {
      imports: [],
      types: [],
      functions: [
        `/** Aggregation route for ${n} */`,
        `app.get('/${camelName}s/aggregate', async (req) => {`,
        `  const opts = req.query as unknown as ${n}AggregateOptions;`,
        `  return aggregate${n}s(req.db, opts);`,
        `});`,
      ],
      sql: [],
      routes: [],
    },
    migration: emptySection(),
  };
}
