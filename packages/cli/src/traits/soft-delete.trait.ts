/**
 * Soft-delete trait — uses deletedAt instead of hard deletes.
 *
 * WHY: Some entities need data retention (auditing, compliance).
 * Soft-delete adds a deletedAt column, filters deleted records
 * from list queries, and replaces delete with a timestamp update.
 */

import type { Trait, TraitContext, TraitOutput } from './trait.types.js';
import { emptySection, sqlOnlySection } from './section-helpers.js';
import { placeholder, timestampType, nowExpr } from './sql-helpers.js';

/** Create the soft-delete trait instance */
export function createSoftDeleteTrait(): Trait {
  return {
    name: 'soft-delete',
    description: 'Soft deletion with deletedAt column and restore',
    dependencies: ['crud'],
    generate: (ctx: TraitContext): TraitOutput => generateSoftDelete(ctx),
  };
}

/** Generate soft-delete code sections */
function generateSoftDelete(ctx: TraitContext): TraitOutput {
  const { schema, storageTarget: st, tableName } = ctx;
  const n = schema.name;
  const p1 = placeholder(st, 1);
  const now = nowExpr(st);
  const tsType = timestampType(st);

  return {
    traitName: 'soft-delete',
    repository: {
      imports: [
        `import type { ${n}Entity } from '@flusk/types';`,
        `import type { DatabaseSync } from 'node:sqlite';`,
      ],
      types: [],
      functions: [
        `/** Soft-delete a ${n} record (sets deletedAt) */
export function softDelete${n}(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare(
    \`UPDATE ${tableName} SET deleted_at = ${now} WHERE id = ${p1} AND deleted_at IS NULL\`
  );
  return stmt.run(id).changes > 0;
}`,
        `/** Restore a soft-deleted ${n} record */
export function restore${n}(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare(
    \`UPDATE ${tableName} SET deleted_at = NULL WHERE id = ${p1} AND deleted_at IS NOT NULL\`
  );
  return stmt.run(id).changes > 0;
}`,
        `/** List only non-deleted ${n} records */
export function listActive${n}s(db: DatabaseSync, limit = 50, offset = 0): ${n}Entity[] {
  const stmt = db.prepare(
    \`SELECT * FROM ${tableName} WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT ? OFFSET ?\`
  );
  return stmt.all(limit, offset) as ${n}Entity[];
}`,
      ],
      sql: [],
      routes: [],
    },
    route: emptySection(),
    migration: sqlOnlySection([
      `ALTER TABLE ${tableName} ADD COLUMN deleted_at ${tsType} DEFAULT NULL;`,
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_deleted_at ON ${tableName}(deleted_at);`,
    ]),
  };
}
