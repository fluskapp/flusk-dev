/**
 * Export trait — generates CSV and JSON export utilities.
 *
 * WHY: Many entities need data export for reporting or
 * compliance (GDPR data portability). This trait generates
 * export functions and route handlers for CSV/JSON output.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection } from './section-helpers.js';

/** Create the export trait instance */
export function createExportTrait(): Trait {
  return {
    name: 'export',
    description: 'CSV and JSON data export utilities',
    dependencies: ['crud'],
    generate: (ctx: TraitContext): TraitOutput => generateExport(ctx),
  };
}

/** Generate export code sections */
function generateExport(ctx: TraitContext): TraitOutput {
  const { schema, tableName, camelName } = ctx;
  const n = schema.name;
  const fields = Object.keys(schema.fields);

  return {
    traitName: 'export',
    repository: {
      imports: [
        `import type { ${n}Entity } from '@flusk/types';`,
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [],
      functions: [
        buildToCsv(n, fields, tableName),
        buildToJson(n, tableName),
      ],
      sql: [],
      routes: [],
    },
    route: {
      imports: [],
      types: [],
      functions: [
        `/** CSV export route for ${n} */`,
        `app.get('/${camelName}s/export/csv', async (req, reply) => {`,
        `  reply.header('Content-Type', 'text/csv');`,
        `  reply.header('Content-Disposition', 'attachment; filename="${camelName}s.csv"');`,
        `  return export${n}sToCsv(req.db);`,
        `});`,
        `/** JSON export route for ${n} */`,
        `app.get('/${camelName}s/export/json', async (req) => {`,
        `  return export${n}sToJson(req.db);`,
        `});`,
      ],
      sql: [],
      routes: [],
    },
    migration: emptySection(),
  };
}

/** Build CSV export function */
function buildToCsv(n: string, fields: string[], table: string): string {
  const headers = ['id', ...fields, 'createdAt', 'updatedAt'];
  return `/** Export all ${n} records as CSV string */
export function export${n}sToCsv(db: DatabaseSync): string {
  const rows = db.prepare('SELECT * FROM ${table}').all() as unknown as ${n}Entity[];
  const header = '${headers.join(',')}';
  const lines = rows.map((r) =>
    [${headers.map((h) => `r.${h} ?? ''`).join(', ')}].join(',')
  );
  return [header, ...lines].join('\\n');
}`;
}

/** Build JSON export function */
function buildToJson(n: string, table: string): string {
  return `/** Export all ${n} records as JSON array */
export function export${n}sToJson(db: DatabaseSync): ${n}Entity[] {
  return db.prepare('SELECT * FROM ${table}').all() as unknown as ${n}Entity[];
}`;
}
