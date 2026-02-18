import type { DatabaseSync } from 'node:sqlite';
import type { RoutingRuleEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new RoutingRule record
 */
export function create(
  db: DatabaseSync,
  data: Omit<RoutingRuleEntity, 'id' | 'createdAt' | 'updatedAt'>,
): RoutingRuleEntity {
  // TODO: implement INSERT for routing_rules
  void data;
  const stmt = db.prepare('SELECT 1');
  const row = stmt.get() as Record<string, unknown>;
  return rowToEntity(row);
}
