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

/**
 * Infer interface name for raw queries (must match multi-file-queries.ts logic)
 */
function inferRawInterfaceName(queryName: string, sql: string): string {
  const colMatches = sql.trim().match(/SELECT\s+(.+?)\s+FROM/is);
  if (colMatches) {
    const cols = colMatches[1].split(',').map((c) => c.trim());
    const colNames = cols.map((col) => {
      const asMatch = col.match(/(?:as\s+)(\w+)$/i);
      return asMatch ? asMatch[1] : col.replace(/\W/g, '_');
    });
    if (colNames.length >= 2 && colNames.every((c) => c.length < 20)) {
      return colNames.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('');
    }
  }
  return queryName.charAt(0).toUpperCase() + queryName.slice(1) + 'Row';
}

/**
 * Convert PascalCase to space-separated words preserving acronyms.
 * "LLMCall" → "LLM Call"
 */
function entityDisplayName(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** Generate barrel index.ts */
function generateBarrel(
  schema: EntitySchema,
  hasUpdate: boolean,
): string {
  const displayName = entityDisplayName(schema.name);
  const lines = [
    `/**`, ` * SQLite ${displayName} Repository barrel`,
    ` */`, ``,
    `export { create } from './create.js';`,
    `export { findById } from './find-by-id.js';`,
  ];

  // Collect all query exports, then sort: function exports first by query order,
  // but interleave them with CRUD in a natural order matching hand-written style
  const queries = normalizeQueries(schema.queries);

  // Find 'single' queries (like findByPromptHash) — these go right after findById
  const singleQueries = queries.filter((q) => q.returns === 'single');
  for (const q of singleQueries) {
    lines.push(`export { ${q.name} } from './${toKebab(q.name)}.js';`);
  }

  lines.push(`export { list } from './list.js';`);
  if (hasUpdate) lines.push(`export { update } from './update.js';`);

  // Remaining queries: raw first (with type exports), then scalar, in YAML order within each group
  const rawQueries = queries.filter((q) => q.type === 'raw-sql' && q.returns === 'raw');
  const scalarQueries = queries.filter((q) => q.returns === 'scalar');
  const listQueries = queries.filter((q) => q.returns === 'list');
  const otherQueries = [...rawQueries, ...scalarQueries, ...listQueries];
  for (const q of otherQueries) {
    const kebab = toKebab(q.name);
    lines.push(`export { ${q.name} } from './${kebab}.js';`);
    if (q.type === 'raw-sql' && q.returns === 'raw' && q.sql) {
      const iface = inferRawInterfaceName(q.name, q.sql);
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
