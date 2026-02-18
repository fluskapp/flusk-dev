import type { DatabaseSync } from 'node:sqlite';
import type { RoutingDecisionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new RoutingDecision record
 */
export function create(
  db: DatabaseSync,
  data: Omit<RoutingDecisionEntity, 'id' | 'createdAt' | 'updatedAt'>,
): RoutingDecisionEntity {
  // TODO: implement INSERT for routing_decisions
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
