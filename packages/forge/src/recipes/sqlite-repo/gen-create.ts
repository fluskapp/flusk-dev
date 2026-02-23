/**
 * Generate the create.ts CRUD file for an entity.
 */

import type { EntityDef } from './types.js';
import { HEADER } from './types.js';

export function genCreate(entity: EntityDef): string {
  const { entityType, table, label, fields } = entity;
  const columns = fields.map((f) => f.snake);
  const placeholders = fields.map(() => '?').join(', ');

  // Build value expressions for stmt.get(...)
  const valueExprs = fields.map((f) => {
    if (f.kind === 'json') {
      if (f.optional) {
        return `    data.${f.camel} != null ? JSON.stringify(data.${f.camel}) : null,`;
      }
      return `    JSON.stringify(data.${f.camel}),`;
    }
    if (f.kind === 'boolean') {
      return `    data.${f.camel} ? 1 : 0,`;
    }
    if (f.optional) {
      return `    data.${f.camel} ?? null,`;
    }
    return `    data.${f.camel},`;
  });

  // Format columns for INSERT — wrap at ~60 chars per line
  const colLines: string[] = [];
  let currentLine = '      ';
  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    const sep = i < columns.length - 1 ? ', ' : '';
    if (currentLine.length + col.length + sep.length > 70 && currentLine.trim().length > 0) {
      colLines.push(currentLine.trimEnd().replace(/,$/, ','));
      currentLine = '      ' + col + sep;
    } else {
      currentLine += col + sep;
    }
  }
  if (currentLine.trim()) colLines.push(currentLine);

  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new ${label} record into SQLite
 */
export function create(
  db: DatabaseSync,
  data: Omit<${entityType}, 'id' | 'createdAt' | 'updatedAt'>,
): ${entityType} {
  const stmt = db.prepare(\`
    INSERT INTO ${table} (
${colLines.join('\n')}
    ) VALUES (${placeholders})
    RETURNING *
  \`);

  const row = stmt.get(
${valueExprs.join('\n')}
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}
