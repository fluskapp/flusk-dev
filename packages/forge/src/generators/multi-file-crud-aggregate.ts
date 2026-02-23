/**
 * Aggregation file generator for multi-file CRUD.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { tbl } from './multi-file-crud-helpers.js';

/** Generate aggregate.ts */
export function generateAggregate(schema: EntitySchema): string {
  const table = tbl(schema.name);
  // Find numeric fields for aggregation
  const numFields = Object.entries(schema.fields)
    .filter(([, f]) => f.type === 'number')
    .map(([n]) => `'${n}'`);
  const fieldUnion = numFields.length > 0 ? numFields.join(' | ') : 'string';

  return `import type { DatabaseSync } from 'node:sqlite';

export interface AggregateOptions {
  op: 'sum' | 'avg' | 'count' | 'min' | 'max';
  field: ${fieldUnion};
  groupBy?: string;
}

export interface AggregateResult {
  value: number;
  group?: string;
}

/**
 * Run an aggregate query on ${schema.name}
 */
export function aggregate(
  db: DatabaseSync,
  opts: AggregateOptions,
): AggregateResult[] {
  const col = String(opts.field).replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
  const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol
    ? \`\${groupCol} as "group", \${fn}(\${col}) as value\`
    : \`COALESCE(\${fn}(\${col}), 0) as value\`;
  const groupClause = groupCol ? \`GROUP BY \${groupCol}\` : '';
  const stmt = db.prepare(
    \`SELECT \${select} FROM ${table} \${groupClause}\`,
  );
  return stmt.all() as unknown as AggregateResult[];
}
`;
}
