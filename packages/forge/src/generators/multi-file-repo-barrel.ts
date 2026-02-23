/**
 * Barrel index.ts generator for multi-file repos.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { toKebab, normalizeQueries } from './multi-file-repo-helpers.js';

/** Infer interface name for raw queries */
function inferRawInterfaceName(queryName: string, sql: string): string {
  const colMatches = sql.trim().match(/SELECT\s+(.+?)\s+FROM/is);
  if (colMatches) {
    const cols = colMatches[1].split(',').map((c) => c.trim());
    const colNames = cols.map((col) => {
      const asMatch = col.match(/(?:as\s+)(\w+)$/i);
      return asMatch ? asMatch[1] : col.replace(/\W/g, '_');
    });
    if (colNames.length >= 2 && colNames.every((c) => c.length < 20)) {
      return colNames.map((c) =>
        c.charAt(0).toUpperCase() + c.slice(1)).join('');
    }
  }
  return queryName.charAt(0).toUpperCase() + queryName.slice(1) + 'Row';
}

/** Convert PascalCase to space-separated words preserving acronyms. */
function entityDisplayName(name: string): string {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** Generate barrel index.ts */
export function generateBarrel(
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

  const queries = normalizeQueries(schema.queries);
  const singleQueries = queries.filter((q) => q.returns === 'single');
  for (const q of singleQueries) {
    lines.push(`export { ${q.name} } from './${toKebab(q.name)}.js';`);
  }

  lines.push(`export { list } from './list.js';`);
  if (hasUpdate) lines.push(`export { update } from './update.js';`);

  const rawQueries = queries.filter(
    (q) => q.type === 'raw-sql' && q.returns === 'raw');
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
