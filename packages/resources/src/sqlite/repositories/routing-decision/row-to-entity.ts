import type { RoutingDecisionEntity } from '@flusk/entities';

/**
 * Convert SQLite row to RoutingDecisionEntity
 */
export function rowToEntity(row: Record<string, unknown>): RoutingDecisionEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as RoutingDecisionEntity;
}
