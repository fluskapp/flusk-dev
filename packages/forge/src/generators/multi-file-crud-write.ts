/**
 * Create and update file generators for multi-file CRUD.
 */

import type { EntitySchema } from '../schema/entity-schema.types.js';
import { tbl, entityLabel, isJson, isBool } from './multi-file-crud-helpers.js';
import { toSnakeCase } from './utils.js';

function toSnake(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
}

/** Generate create.ts */
export function generateCreate(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema.name);
  const fields = Object.entries(schema.fields);
  const colNames = fields.map(([name]) => toSnake(name));
  const colLines: string[] = [];
  for (let i = 0; i < colNames.length; i += 5) {
    colLines.push(colNames.slice(i, i + 5).join(', '));
  }
  const cols = colLines.join(',\n      ');
  const ph = fields.map(() => '?').join(', ');
  const vals = fields.map(([name, field]) => {
    if (isJson(field)) {
      return field.required
        ? `    JSON.stringify(data.${name}),`
        : `    data.${name} != null ? JSON.stringify(data.${name}) : null,`;
    }
    if (isBool(field)) return `    data.${name} ? 1 : 0,`;
    if (!field.required) return `    data.${name} ?? null,`;
    return `    data.${name},`;
  });
  const label = entityLabel(n);
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Insert a new ${label} record into SQLite\n */\nexport function create(\n  db: DatabaseSync,\n  data: Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>,\n): ${n}Entity {\n  const stmt = db.prepare(\`\n    INSERT INTO ${table} (\n      ${cols}\n    ) VALUES (${ph})\n    RETURNING *\n  \`);\n\n  const row = stmt.get(\n${vals.join('\n')}\n  ) as Record<string, unknown>;\n\n  return rowToEntity(row);\n}\n`;
}

/** Generate update.ts */
export function generateUpdate(schema: EntitySchema): string {
  const n = schema.name;
  const table = tbl(schema.name);
  const label = entityLabel(n);
  return `import type { DatabaseSync } from 'node:sqlite';\nimport type { ${n}Entity } from '@flusk/entities';\nimport { rowToEntity } from './row-to-entity.js';\n\n/**\n * Update a ${label}\n */\nexport function update(\n  db: DatabaseSync,\n  id: string,\n  data: Partial<Omit<${n}Entity, 'id' | 'createdAt' | 'updatedAt'>>,\n): ${n}Entity | null {\n  const sets: string[] = [];\n  const values: unknown[] = [];\n  for (const [key, value] of Object.entries(data)) {\n    if (value === undefined) continue;\n    const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();\n    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {\n      sets.push(\`\${snake} = ?\`);\n      values.push(JSON.stringify(value));\n    } else {\n      sets.push(\`\${snake} = ?\`);\n      values.push(value);\n    }\n  }\n  if (sets.length === 0) return null;\n  values.push(id);\n  const stmt = db.prepare(\n    \`UPDATE ${table} SET \${sets.join(', ')} WHERE id = ? RETURNING *\`,\n  );\n  const row = stmt.get(...values) as Record<string, unknown> | undefined;\n  return row ? rowToEntity(row) : null;\n}\n`;
}
