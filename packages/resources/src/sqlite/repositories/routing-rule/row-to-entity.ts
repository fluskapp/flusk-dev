import type { RoutingRuleEntity } from '@flusk/entities';

/**
 * Convert SQLite row to RoutingRuleEntity
 */
export function rowToEntity(row: Record<string, unknown>): RoutingRuleEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as RoutingRuleEntity;
}
