import type { PromptTemplateEntity } from '@flusk/entities';

/**
 * Convert SQLite row to PromptTemplateEntity
 */
export function rowToEntity(row: Record<string, unknown>): PromptTemplateEntity {
  // TODO: implement snake_case → camelCase mapping
  return row as unknown as PromptTemplateEntity;
}
