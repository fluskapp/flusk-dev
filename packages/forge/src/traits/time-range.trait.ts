/**
 * Time-range trait — generates findByTimeRange + date indexes.
 *
 * WHY: Many entities need time-based queries (analytics, logs).
 * This trait adds a findByTimeRange method that uses rowToEntity
 * for proper type mapping, and creates an index on created_at
 * for efficient time-range scans.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { sqlOnlySection } from './section-helpers.js';
import { placeholder } from './sql-helpers.js';
import { buildPgTimeRange, buildSqliteTimeRange } from './time-range-builders.js';

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
  const { schema, storageTarget: st, tableName } = ctx;
  const n = schema.name;
  const p1 = placeholder(st, 1);
  const p2 = placeholder(st, 2);

  const dbType = st === 'postgres' ? 'Pool' : 'DatabaseSync';
  const dbImport = st === 'postgres'
    ? `import type { Pool } from 'pg';`
    : `import type { DatabaseSync } from 'node:sqlite';`;

  const fnBody = st === 'postgres'
    ? buildPgTimeRange(n, tableName)
    : buildSqliteTimeRange(n, tableName, p1, p2, dbType);

  return {
    traitName: 'time-range',
    repository: {
      imports: [
        dbImport,
        `import type { ${n}Entity } from '@flusk/entities';`,
      ],
      types: [],
      functions: [fnBody],
      sql: [],
      routes: [],
    },
    route: {
      imports: [],
      types: [],
      functions: [
        [
          `  /** Time-range query route for ${n} */`,
          `  fastify.get('/by-time-range', async (req) => {`,
          `    const { from, to } = req.query as { from: string; to: string };`,
          `    return ${n}Repository.find${n}sByTimeRange(fastify.db, from, to);`,
          `  });`,
        ].join('\n'),
      ],
      sql: [],
      routes: [],
    },
    migration: sqlOnlySection([
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at);`,
    ]),
  };
}
