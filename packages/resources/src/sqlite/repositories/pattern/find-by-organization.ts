import type { DatabaseSync } from 'node:sqlite';
import type { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all patterns for an organization
 */
export function findByOrganization(
  db: DatabaseSync, orgId: string,
): PatternEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM patterns WHERE organization_id = ? ORDER BY total_cost DESC',
  );
  const rows = stmt.all(orgId) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
