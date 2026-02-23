/**
 * Generate find-by-id.ts and list.ts CRUD files for an entity.
 */

import type { EntityDef } from './types.js';
import { HEADER } from './types.js';

export function genFindById(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find ${entity.label} by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): ${entityType} | null {
  const stmt = db.prepare('SELECT * FROM ${table} WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}

export function genList(entity: EntityDef): string {
  const { entityType, table } = entity;
  return `${HEADER(entity)}

// --- BEGIN GENERATED ---
import type { DatabaseSync } from 'node:sqlite';
import type { ${entityType} } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List ${entity.label}s with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): ${entityType}[] {
  const stmt = db.prepare(
    'SELECT * FROM ${table} ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
// --- END GENERATED ---

// --- BEGIN CUSTOM ---
// --- END CUSTOM ---
`;
}
