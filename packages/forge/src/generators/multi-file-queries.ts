/**
 * Custom query file generators for multi-file repository output.
 *
 * WHY: Generates individual query files from YAML query definitions.
 * Supports standard WHERE queries, raw SQL, and scalar/list/single returns.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import type { QuerySchema } from '../schema/query-schema.types.js';
import type { GeneratedFile } from './multi-file-repo.js';
import { toKebab } from './multi-file-repo.js';
import {
  tbl,
  parseParams,
  replaceParams,
  isSingleLineSql,
  generateRawQuery,
} from './multi-file-queries-helpers.js';

function buildScalarBody(sql: string, args: string[]): string {
  const trimmedSql = sql.trim();
  const argsStr = args.length > 0 ? args.join(', ') : '';
  const getCall = argsStr ? `get(${argsStr})` : 'get()';

  if (isSingleLineSql(trimmedSql) && trimmedSql.length <= 70) {
    return `  const stmt = db.prepare('${trimmedSql}');\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
  }
  if (isSingleLineSql(trimmedSql)) {
    return `  const stmt = db.prepare(\n    '${trimmedSql}',\n  );\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
  }
  const sqlLines = sql.split('\n');
  const indented = sqlLines.map((line) => {
    const trimmed = line.trimEnd();
    if (trimmed === '') return '';
    return `    ${trimmed.replace(/^\s+/, (m) => ' '.repeat(Math.min(m.length, 6)))}`;
  }).join('\n');
  return `  const stmt = db.prepare(\`\n${indented}\n  \`);\n  const row = stmt.${getCall} as { total: number };\n  return row.total;`;
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
    const body = buildScalarBody(sql, args);
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParams}): number {\n${body}\n}\n`,
    };
  }

  if (query.type === 'raw-sql' && query.returns === 'raw') {
    const { sql: resolvedSql, args } = replaceParams(query.sql!.trim(), names);
    const fnParams = types.length > 0
      ? `db: DatabaseSync, ${types.join(', ')}`
      : 'db: DatabaseSync';
    const resolvedQuery = { ...query, sql: resolvedSql };
    return { filename: `${kebab}.ts`, content: generateRawQuery(resolvedQuery, fnParams, args) };
  }

  if (query.returns === 'single') {
    const { sql, args } = replaceParams(query.where as string, names);
    const order = query.order ? ` ORDER BY ${query.order}` : '';
    const limit = query.limit ? ` LIMIT ${query.limit}` : '';
    const fnParamLines = types.length > 0
      ? `\n  db: DatabaseSync,\n  ${types.join(',\n  ')},\n`
      : 'db: DatabaseSync';
    return {
      filename: `${kebab}.ts`,
      content: `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * ${query.description ?? query.name}\n */\nexport function ${query.name}(${fnParamLines}): ${n}Entity | null {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} WHERE ${sql}${order}${limit}',\n  );\n  const row = stmt.get(${args.join(', ')}) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`,
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
