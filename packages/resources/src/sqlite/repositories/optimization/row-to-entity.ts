import type { OptimizationEntity } from '@flusk/entities';

/**
 * Convert SQLite row to OptimizationEntity
 */
export function rowToEntity(row: Record<string, unknown>): OptimizationEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as OptimizationEntity;
}
