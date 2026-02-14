/**
 * Multi-file repository generator — generates one file per function.
 *
 * WHY: The existing hand-written repos use one-file-per-function in
 * a directory. This generator matches that structure so generated
 * code can drop-in replace hand-written code.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import type { QuerySchema } from '../schema/query-schema.types.js';
import { generateRowToEntity, generateCreate, generateFindById, generateList, generateUpdate } from './multi-file-crud.js';
import { generateCustomQuery } from './multi-file-queries.js';

/** A generated file with path and content */
export interface GeneratedFile {
  /** Filename (e.g., 'create.ts') */
  filename: string;
  /** Full file content */
  content: string;
}

/** Convert camelCase to kebab-case */
export function toKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Normalize queries from array or record format */
export function normalizeQueries(
  queries?: QuerySchema[] | Record<string, QuerySchema>,
): Array<QuerySchema & { name: string }> {
  if (!queries) return [];
  if (Array.isArray(queries)) {
    return queries.filter((q) => q.name) as Array<QuerySchema & { name: string }>;
  }
  return Object.entries(queries).map(([name, q]) => ({ ...q, name }));
}

/** Generate barrel index.ts */
function generateBarrel(
  schema: EntitySchema,
  hasUpdate: boolean,
): string {
  const lines = [
    `/**`, ` * SQLite ${schema.name} Repository barrel`,
    ` * @generated from ${schema.name} YAML`, ` */`, ``,
    `export { create } from './create.js';`,
    `export { findById } from './find-by-id.js';`,
    `export { list } from './list.js';`,
  ];
  if (hasUpdate) lines.push(`export { update } from './update.js';`);

  const queries = normalizeQueries(schema.queries);
  for (const q of queries) {
    const kebab = toKebab(q.name);
    lines.push(`export { ${q.name} } from './${kebab}.js';`);
    if (q.type === 'raw-sql' && q.returns === 'raw') {
      const iface = `${q.name.charAt(0).toUpperCase() + q.name.slice(1)}Row`;
      lines.push(`export type { ${iface} } from './${kebab}.js';`);
    }
  }
  return lines.join('\n') + '\n';
}

/**
 * Generate all repository files for an entity.
 */
export function generateMultiFileRepo(
  schema: EntitySchema,
  options?: { includeUpdate?: boolean },
): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const hasUpdate = options?.includeUpdate ?? false;

  files.push({ filename: 'row-to-entity.ts', content: generateRowToEntity(schema) });
  files.push({ filename: 'create.ts', content: generateCreate(schema) });
  files.push({ filename: 'find-by-id.ts', content: generateFindById(schema) });
  files.push({ filename: 'list.ts', content: generateList(schema) });
  if (hasUpdate) {
    files.push({ filename: 'update.ts', content: generateUpdate(schema) });
  }

  const queries = normalizeQueries(schema.queries);
  for (const q of queries) {
    files.push(generateCustomQuery(schema, q));
  }

  files.push({ filename: 'index.ts', content: generateBarrel(schema, hasUpdate) });
  return files;
}
