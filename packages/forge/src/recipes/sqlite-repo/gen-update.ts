/**
 * Generate update.ts CRUD file for an entity.
 */

import type { EntityDef } from './types.js';
import { HEADER } from './types.js';

export function genUpdate(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update a ${entity.label}
 */
export function update(
  db: DatabaseSync,
  id: string,
  data: Partial<Omit<${entityType}, 'id' | 'createdAt' | 'updatedAt'>>,
): ${entityType} | null {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      sets.push(\`\${snake} = ?\`);
      values.push(JSON.stringify(value) as string);
    } else {
      sets.push(\`\${snake} = ?\`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length === 0) return null;
  values.push(id);
  const stmt = db.prepare(
    \`UPDATE ${table} SET \${sets.join(', ')} WHERE id = ? RETURNING *\`,
  );
  const row = stmt.get(...values) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}
