import type { PromptVersionEntity } from '@flusk/entities';

/**
 * Convert SQLite row to PromptVersionEntity
 */
export function rowToEntity(row: Record<string, unknown>): PromptVersionEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as PromptVersionEntity;
}
