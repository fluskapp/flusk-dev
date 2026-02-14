/**
 * CRUD file generators for multi-file repository output.
 *
 * WHY: Generates individual create, findById, list, update,
 * and rowToEntity files matching the hand-written directory structure.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import type { FieldSchema } from '../schema/field-schema.types.js';
import { toSnakeCase, toKebabCase } from './utils.js';

function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

function tbl(schema: EntitySchema): string {
  return toSnakeCase(schema.name).replace(/-/g, '_') + 's';
}

function isJson(f: FieldSchema): boolean { return f.type === 'json' || f.type === 'array'; }
function isBool(f: FieldSchema): boolean { return f.type === 'boolean'; }
function isDate(f: FieldSchema): boolean { return f.type === 'date'; }

/** Generate row-to-entity.ts */
export function generateRowToEntity(schema: EntitySchema): string {
  const n = schema.name;
  const fields = Object.entries(schema.fields);
  const needsISO = fields.some(([, f]) => isDate(f));
  const mappings = fields.map(([name, field]) => {
    const snake = toSnake(name);
    if (isJson(field)) {
      return field.required
        ? `    ${name}: JSON.parse(row.${snake} as string),`
        : `    ${name}: row.${snake} != null ? JSON.parse(row.${snake} as string) : undefined,`;
    }
    if (isBool(field)) return `    ${name}: Boolean(row.${snake}),`;
    if (isDate(field)) {
      return field.required
        ? `    ${name}: toISOString(row.${snake}),`
        : `    ${name}: row.${snake} != null ? toISOString(row.${snake}) : undefined,`;
    }
    const cast = field.type === 'number' || field.type === 'integer' ? 'number' : 'string';
    return field.required
      ? `    ${name}: row.${snake} as ${cast},`
      : `    ${name}: (row.${snake} as ${cast}) ?? undefined,`;
  });
  const imports = [`import type { ${n}Entity } from '@flusk/entities';`];
  if (needsISO) imports.push(`import { toISOString } from '../../../shared/map-row.js';`);
  return `${imports.join('\n')}\n\n/** Convert SQLite row to ${n}Entity */\nexport function rowToEntity(row: Record<string, unknown>): ${n}Entity {\n  return {\n    id: row.id as string,\n    createdAt: toISOString(row.created_at),\n    updatedAt: toISOString(row.updated_at),\n${mappings.join('\n')}\n  };\n}\n`;
}

/** Generate create.ts */
export function generateCreate(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema);
  const fields = Object.entries(schema.fields);
  const cols = fields.map(([name]) => toSnake(name)).join(',\n      ');
  const ph = fields.map(() => '?').join(', ');
  const vals = fields.map(([name, field]) => {
    if (isJson(field)) {
      return field.required ? `    JSON.stringify(data.${name}),` : `    data.${name} != null ? JSON.stringify(data.${name}) : null,`;
    }
    if (isBool(field)) return `    data.${name} ? 1 : 0,`;
    if (!field.required) return `    data.${name} ?? null,`;
    return `    data.${name},`;
  });
  const label = toKebabCase(n).replace(/-/g, ' ');
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Insert a new ${label} record\n */\nexport function create(\n  db: DatabaseSync,\n  data: Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>,\n): ${n}Entity {\n  const stmt = db.prepare(\`\n    INSERT INTO ${table} (\n      ${cols}\n    ) VALUES (${ph})\n    RETURNING *\n  \`);\n\n  const row = stmt.get(\n${vals.join('\n')}\n  ) as Record<string, unknown>;\n\n  return rowToEntity(row);\n}\n`;
}

/** Generate find-by-id.ts */
export function generateFindById(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema);
  const label = toKebabCase(n).replace(/-/g, ' ');
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Find ${label} by id\n */\nexport function findById(\n  db: DatabaseSync,\n  id: string,\n): ${n}Entity | null {\n  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');\n  const row = stmt.get(id) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`;
}

/** Generate list.ts */
export function generateList(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema);
  const orderCol = schema.fields['startedAt'] ? 'started_at' : 'created_at';
  const label = toKebabCase(n).replace(/-/g, ' ');
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * List ${label}s with pagination\n */\nexport function list(\n  db: DatabaseSync,\n  limit = 50,\n  offset = 0,\n): ${n}Entity[] {\n  const stmt = db.prepare(\n    'SELECT * FROM ${table} ORDER BY ${orderCol} DESC LIMIT ? OFFSET ?',\n  );\n  const rows = stmt.all(limit, offset) as Record<string, unknown>[];\n  return rows.map(rowToEntity);\n}\n`;
}

/** Generate update.ts */
export function generateUpdate(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema);
  const label = toKebabCase(n).replace(/-/g, ' ');
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Update a ${label}\n */\nexport function update(\n  db: DatabaseSync,\n  id: string,\n  data: Partial<Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>>,\n): ${n}Entity | null {\n  const sets: string[] = [];\n  const values: unknown[] = [];\n  for (const [key, value] of Object.entries(data)) {\n    if (value === undefined) continue;\n    const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();\n    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {\n      sets.push(\`\${snake} = ?\`);\n      values.push(JSON.stringify(value));\n    } else {\n      sets.push(\`\${snake} = ?\`);\n      values.push(value);\n    }\n  }\n  if (sets.length === 0) return null;\n  values.push(id);\n  const stmt = db.prepare(\n    \`UPDATE ${table} SET \${sets.join(', ')} WHERE id = ? RETURNING *\`,\n  );\n  const row = stmt.get(...values) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`;
}
