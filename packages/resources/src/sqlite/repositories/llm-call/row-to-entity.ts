import type { LLMCallEntity, TokenUsage } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to LLMCallEntity */
export function rowToEntity(row: Record<string, unknown>): LLMCallEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
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
