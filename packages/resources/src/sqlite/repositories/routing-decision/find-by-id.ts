import type { DatabaseSync } from 'node:sqlite';
import type { RoutingDecisionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find RoutingDecision by id
 */
export function findById(
  db: DatabaseSync,
  id: string,
): RoutingDecisionEntity | null {
  const stmt = db.prepare('SELECT * FROM routing_decisions WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
