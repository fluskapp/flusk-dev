import type { DatabaseSync } from 'node:sqlite';
import type { RoutingDecisionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * List RoutingDecision records with pagination
 */
export function list(
  db: DatabaseSync,
  limit = 50,
  offset = 0,
): RoutingDecisionEntity[] {
  const stmt = db.prepare(
    'SELECT * FROM routing_decisions ORDER BY created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
