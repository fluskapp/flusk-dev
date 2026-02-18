import type { SpanEntity } from '@flusk/entities';

/**
 * Convert SQLite row to SpanEntity
 */
export function rowToEntity(row: Record<string, unknown>): SpanEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as SpanEntity;
}
