/**
 * Helper functions for custom query generation.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import type { QuerySchema } from '../schema/query-schema.types.js';
import { toSnakeCase } from './utils.js';

export function tbl(schema: EntitySchema): string {
  return toSnakeCase(schema.name).replace(/-/g, '_') + 's';
}

export function parseParams(query: QuerySchema & { name: string }) {
  const params = query.params ?? {};
  const entries = Object.entries(params);
  const names = entries.map(([n]) => n);
  const types = entries.map(([n, def]) => {
    const t = typeof def === 'string' ? def : def.type;
    return `${n}: ${t}`;
  });
  return { names, types };
}

export function replaceParams(
  sql: string,
  paramNames: string[],
): { sql: string; args: string[] } {
  let result = sql;
  const args: string[] = [];
  for (const p of paramNames) {
    result = result.replace(new RegExp(`:${p}`, 'g'), '?');
    args.push(p);
  }
  return { sql: result, args };
}

/** Check if SQL is a single line (no meaningful newlines) */
export function isSingleLineSql(sql: string): boolean {
  return sql.trim().split('\n').length === 1;
}

/**
 * Infer a clean interface name from query name and columns.
 */
export function inferInterfaceName(queryName: string, cols: string[]): string {
  const colNames = cols.map((col) => {
    const asMatch = col.match(/(?:as\s+)(\w+)$/i);
    return asMatch ? asMatch[1] : col.replace(/\W/g, '_');
  });

  if (colNames.length >= 2 && colNames.every((c) => c.length < 20)) {
    return colNames.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('');
  }

  return queryName.charAt(0).toUpperCase() + queryName.slice(1) + 'Row';
}

/** Generate raw query with inferred return type */
export function generateRawQuery(
  query: QuerySchema & { name: string },
  fnParams: string,
): string {
  const sql = query.sql!.trim();
  const colMatches = sql.match(/SELECT\s+(.+?)\s+FROM/is);
  if (!colMatches) {
    return `import type { DatabaseSync } from 'node:sqlite';\n\nexport function ${query.name}(${fnParams}): unknown[] {\n  return db.prepare('${sql}').all();\n}\n`;
  }
  const cols = colMatches[1].split(',').map((c) => c.trim());
  const iface = inferInterfaceName(query.name, cols);
  const fields = cols.map((col) => {
    const asMatch = col.match(/(?:as\s+)(\w+)$/i);
    const isNum = /COUNT\s*\(/i.test(col) || /SUM\s*\(/i.test(col);
    const name = asMatch ? asMatch[1] : col.replace(/\W/g, '_');
    return `  ${name}: ${isNum ? 'number' : 'string'};`;
  });
  return `import type { DatabaseSync } from 'node:sqlite';\n\nexport interface ${iface} {\n${fields.join('\n')}\n}\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): ${iface}[] {\n  const stmt = db.prepare(\n    '${sql}',\n  );\n  return stmt.all() as unknown as ${iface}[];\n}\n`;
}
