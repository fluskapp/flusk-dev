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
  const fnParams = types.length > 0
    ? `db: DatabaseSync, ${types.join(', ')}`
    : 'db: DatabaseSync';
  return { names, fnParams };
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

/** Generate a custom query file */
export function generateCustomQuery(
  schema: EntitySchema,
  query: QuerySchema & { name: string },
): GeneratedFile {
  const n = schema.name;
  const table = tbl(schema);
  const kebab = toKebab(query.name);
  const { names, fnParams } = parseParams(query);

  if (query.type === 'raw-sql' && query.returns === 'scalar') {
    const { sql, args } = replaceParams(query.sql!.trim(), names);
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): number {\n  const stmt = db.prepare(\`\n    ${sql}\n  \`);\n  const row = stmt.get(${args.join(', ')}) as { total: number };\n  return row.total;\n}\n`,
    };
  }

  if (query.type === 'raw-sql' && query.returns === 'raw') {
    return { filename: `${kebab}.ts`, content: generateRawQuery(query, fnParams) };
  }

  if (query.returns === 'single') {
    const { sql, args } = replaceParams(query.where as string, names);
    const order = query.order ? ` ORDER BY ${query.order}` : '';
    const limit = query.limit ? ` LIMIT ${query.limit}` : '';
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(\n  ${fnParams},\n): ${n}Entity | null {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} WHERE ${sql}${order}${limit}',\n  );\n  const row = stmt.get(${args.join(', ')}) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`,
    };
  }

  if (query.returns === 'list') {
    const { sql, args } = replaceParams(query.where as string, names);
    const order = query.order ? ` ORDER BY ${query.order}` : '';
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
  const iface = `${query.name.charAt(0).toUpperCase() + query.name.slice(1)}Row`;
  const fields = cols.map((col) => {
    const asMatch = col.match(/(?:as\s+)(\w+)$/i);
    const isNum = /COUNT\s*\(/i.test(col) || /SUM\s*\(/i.test(col);
    const name = asMatch ? asMatch[1] : col.replace(/\W/g, '_');
    return `  ${name}: ${isNum ? 'number' : 'string'};`;
  });
  return `import type { DatabaseSync } from 'node:sqlite';\n\nexport interface ${iface} {\n${fields.join('\n')}\n}\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): ${iface}[] {\n  const stmt = db.prepare(\n    '${sql}',\n  );\n  return stmt.all() as ${iface}[];\n}\n`;
}
