/**
 * Custom query file generators for multi-file repository output.
 *
 * WHY: Generates individual query files from YAML query definitions.
 * Supports standard WHERE queries, raw SQL, and scalar/list/single returns.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import type { QuerySchema } from '../schema/query-schema.types.js';
import { toSnakeCase } from './utils.js';
import type { GeneratedFile } from './multi-file-repo.js';
import { toKebab } from './multi-file-repo.js';

function tbl(schema: EntitySchema): string {
  return toSnakeCase(schema.name).replace(/-/g, '_') + 's';
}

function parseParams(query: QuerySchema & { name: string }) {
  const params = query.params ?? {};
  const entries = Object.entries(params);
  const names = entries.map(([n]) => n);
  const types = entries.map(([n, def]) => {
    const t = typeof def === 'string' ? def : def.type;
    return `${n}: ${t}`;
  });
  return { names, types };
}

function replaceParams(sql: string, paramNames: string[]): { sql: string; args: string[] } {
  let result = sql;
  const args: string[] = [];
  for (const p of paramNames) {
    result = result.replace(new RegExp(`:${p}`, 'g'), '?');
    args.push(p);
  }
  return { sql: result, args };
}

/** Check if SQL is a single line (no meaningful newlines) */
function isSingleLineSql(sql: string): boolean {
  return sql.trim().split('\n').length === 1;
}

/** Generate a custom query file */
export function generateCustomQuery(
  schema: EntitySchema,
  query: QuerySchema & { name: string },
): GeneratedFile {
  const n = schema.name;
  const table = tbl(schema);
  const kebab = toKebab(query.name);
  const { names, types } = parseParams(query);

  if (query.type === 'raw-sql' && query.returns === 'scalar') {
    const { sql, args } = replaceParams(query.sql!.trim(), names);
    const fnParams = types.length > 0
      ? `db: DatabaseSync, ${types.join(', ')}`
      : 'db: DatabaseSync';

    let body: string;
    const trimmedSql = sql.trim();
    if (isSingleLineSql(trimmedSql) && trimmedSql.length <= 70) {
      const argsStr = args.length > 0 ? args.join(', ') : '';
      const getCall = argsStr ? `get(${argsStr})` : 'get()';
      body = `  const stmt = db.prepare('${trimmedSql}');\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
    } else if (isSingleLineSql(trimmedSql)) {
      // Single-line but long: wrap with db.prepare(\n    '...',\n  )
      const argsStr = args.length > 0 ? args.join(', ') : '';
      const getCall = argsStr ? `get(${argsStr})` : 'get()';
      body = `  const stmt = db.prepare(\n    '${trimmedSql}',\n  );\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
    } else {
      // Multi-line SQL: preserve indentation
      const sqlLines = sql.split('\n');
      const indented = sqlLines.map((line) => {
        const trimmed = line.trimEnd();
        if (trimmed === '') return '';
        return `    ${trimmed.replace(/^\s+/, (m) => ' '.repeat(Math.min(m.length, 6)))}`;
      }).join('\n');
      const argsStr = args.length > 0 ? args.join(', ') : '';
      const getCall = argsStr ? `get(${argsStr})` : 'get()';
      body = `  const stmt = db.prepare(\`\n${indented}\n  \`);\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
    }

    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): number {\n${body}\n}\n`,
    };
  }

  if (query.type === 'raw-sql' && query.returns === 'raw') {
    const fnParams = types.length > 0
      ? `db: DatabaseSync, ${types.join(', ')}`
      : 'db: DatabaseSync';
    return { filename: `${kebab}.ts`, content: generateRawQuery(query, fnParams) };
  }

  if (query.returns === 'single') {
    const { sql, args } = replaceParams(query.where as string, names);
    const order = query.order ? ` ORDER BY ${query.order}` : '';
    const limit = query.limit ? ` LIMIT ${query.limit}` : '';
    // Format function params: each on its own line when there are params
    const fnParamLines = types.length > 0
      ? `\n  db: DatabaseSync,\n  ${types.join(',\n  ')},\n`
      : 'db: DatabaseSync';
    const fnParamsCall = fnParamLines.includes('\n') ? fnParamLines : `${fnParamLines}`;
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParamsCall}): ${n}Entity | null {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} WHERE ${sql}${order}${limit}',\n  );\n  const row = stmt.get(${args.join(', ')}) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`,
    };
  }

  if (query.returns === 'list') {
    const { sql, args } = replaceParams(query.where as string, names);
    const order = query.order ? ` ORDER BY ${query.order}` : '';
    const fnParams = types.length > 0
      ? `db: DatabaseSync, ${types.join(', ')}`
      : 'db: DatabaseSync';
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(\n  ${fnParams},\n): ${n}Entity[] {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} WHERE ${sql}${order}',\n  );\n  const rows = stmt.all(${args.join(', ')}) as Record<string, unknown>[];\n  return rows.map(rowToEntity);\n}\n`,
    };
  }

  return { filename: `${kebab}.ts`, content: `// TODO: Unsupported query type for ${query.name}\n` };
}

/** Generate raw query with inferred return type */
function generateRawQuery(
  query: QuerySchema & { name: string },
  fnParams: string,
): string {
  const sql = query.sql!.trim();
  const colMatches = sql.match(/SELECT\s+(.+?)\s+FROM/is);
  if (!colMatches) {
    return `import type { DatabaseSync } from 'node:sqlite';\n\nexport function ${query.name}(${fnParams}): unknown[] {\n  return db.prepare('${sql}').all();\n}\n`;
  }
  const cols = colMatches[1].split(',').map((c) => c.trim());
  // Use a clean interface name based on the return columns
  // For "countByModel" with columns [model, count] → "ModelCount"
  const iface = inferInterfaceName(query.name, cols);
  const fields = cols.map((col) => {
    const asMatch = col.match(/(?:as\s+)(\w+)$/i);
    const isNum = /COUNT\s*\(/i.test(col) || /SUM\s*\(/i.test(col);
    const name = asMatch ? asMatch[1] : col.replace(/\W/g, '_');
    return `  ${name}: ${isNum ? 'number' : 'string'};`;
  });
  return `import type { DatabaseSync } from 'node:sqlite';\n\nexport interface ${iface} {\n${fields.join('\n')}\n}\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): ${iface}[] {\n  const stmt = db.prepare(\n    '${sql}',\n  );\n  return stmt.all() as ${iface}[];\n}\n`;
}

/**
 * Infer a clean interface name from query name and columns.
 * "countByModel" with [model, count] → "ModelCount"
 * Falls back to PascalCase of query name + "Row"
 */
function inferInterfaceName(queryName: string, cols: string[]): string {
  // Extract column names (after AS if present)
  const colNames = cols.map((col) => {
    const asMatch = col.match(/(?:as\s+)(\w+)$/i);
    return asMatch ? asMatch[1] : col.replace(/\W/g, '_');
  });

  // Try to build a name from columns: capitalize each and join
  if (colNames.length >= 2 && colNames.every((c) => c.length < 20)) {
    return colNames.map((c) => c.charAt(0).toUpperCase() + c.slice(1)).join('');
  }

  // Fallback: PascalCase of query name + Row
  return queryName.charAt(0).toUpperCase() + queryName.slice(1) + 'Row';
}
