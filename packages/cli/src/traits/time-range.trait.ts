/** @generated —
 * Time-range trait — generates findByTimeRange + date indexes.
 *
 * WHY: Many entities need time-based queries (analytics, logs).
 * This trait adds a findByTimeRange method and creates an index
 * on created_at for efficient time-range scans.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { sqlOnlySection } from './section-helpers.js';
import { placeholder } from './sql-helpers.js';

/** Create the time-range trait instance */
export function createTimeRangeTrait(): Trait {
  return {
    name: 'time-range',
    description: 'Time-based range queries with date indexes',
    dependencies: [],
    generate: (ctx: TraitContext): TraitOutput => generateTimeRange(ctx),
  };
}

/** Generate time-range query code sections */
function generateTimeRange(ctx: TraitContext): TraitOutput {
  const { schema, storageTarget: st, tableName, camelName } = ctx;
  const n = schema.name;
  const p1 = placeholder(st, 1);
  const p2 = placeholder(st, 2);

  return {
    traitName: 'time-range',
    repository: {
      imports: [
        `import type { ${n}Entity } from '@flusk/types';`,
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [],
      functions: [
        `/** Find ${n} records within a time range */
export function find${n}sByTimeRange(
  db: DatabaseSync, from: string, to: string,
): ${n}Entity[] {
  const stmt = db.prepare(
    \`SELECT * FROM ${tableName} WHERE created_at >= ${p1} AND created_at <= ${p2} ORDER BY created_at DESC\`
  );
  return stmt.all(from, to) as ${n}Entity[];
}`,
      ],
      sql: [],
      routes: [],
    },
    route: {
      imports: [],
      types: [],
      functions: [
        `/** Time-range query route for ${n} */`,
        `app.get('/${camelName}s/by-time-range', async (req) => {`,
        `  const { from, to } = req.query as { from: string; to: string };`,
        `  return find${n}sByTimeRange(req.db, from, to);`,
        `});`,
      ],
      sql: [],
      routes: [],
    },
    migration: sqlOnlySection([
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);`,
    ]),
  };
}
