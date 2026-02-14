import { LLMCallEntity, TokenUsage } from '@flusk/entities';

interface LlmCallRow {
  id: string;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
  provider: string;
  model: string;
  prompt: string;
  prompt_hash: string;
  tokens: TokenUsage;
  cost: string;
  response: string;
  cached: boolean;
  organization_id: string;
  consent_given?: boolean;
  consent_purpose?: string;
}

/**
 * Convert database row to LLMCallEntity
 */
export function rowToEntity(row: LlmCallRow): LLMCallEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    promptHash: row.prompt_hash,
    tokens: row.tokens,
    cost: parseFloat(row.cost),
    response: row.response,
    cached: row.cached,
    organizationId: row.organization_id,
    consentGiven: row.consent_given ?? true,
    consentPurpose: row.consent_purpose ?? 'optimization'
  };
}
