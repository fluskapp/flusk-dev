import type { LLMCallEntity, TokenUsage } from '@flusk/entities';

/**
 * Convert SQLite row to LLMCallEntity
 */
export function rowToEntity(row: Record<string, unknown>): LLMCallEntity {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    provider: row.provider as string,
    model: row.model as string,
    prompt: row.prompt as string,
    promptHash: row.prompt_hash as string,
    tokens: JSON.parse(row.tokens as string) as TokenUsage,
    cost: row.cost as number,
    response: row.response as string,
    cached: Boolean(row.cached),
    organizationId: (row.organization_id as string) ?? undefined,
    consentGiven: true,
    consentPurpose: 'optimization',
  };
}
