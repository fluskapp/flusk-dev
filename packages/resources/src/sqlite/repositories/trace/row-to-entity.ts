import type { TraceEntity } from '@flusk/entities';

/**
 * Convert SQLite row to TraceEntity
 */
export function rowToEntity(row: Record<string, unknown>): TraceEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as TraceEntity;
}
