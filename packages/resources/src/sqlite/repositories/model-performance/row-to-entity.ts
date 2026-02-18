import type { ModelPerformanceEntity } from '@flusk/entities';

/**
 * Convert SQLite row to ModelPerformanceEntity
 */
export function rowToEntity(row: Record<string, unknown>): ModelPerformanceEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as ModelPerformanceEntity;
}
