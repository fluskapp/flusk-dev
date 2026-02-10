import { LLMCallEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

/**
 * Create a new LLM call record
 * @param llmCall - Partial LLM call data (id, timestamps auto-generated)
 * @returns Created LLM call entity with generated id and timestamps
 */
export async function create(
  llmCall: Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<LLMCallEntity> {
  const db = getPool();

  const query = `
    INSERT INTO llm_calls (
      provider, model, prompt, prompt_hash, tokens, cost,
      response, cached, organization_id, consent_given, consent_purpose
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
  `;

  const values = [
    llmCall.provider,
    llmCall.model,
    llmCall.prompt,
    llmCall.promptHash,
    JSON.stringify(llmCall.tokens),
    llmCall.cost,
    llmCall.response,
    llmCall.cached,
    llmCall.organizationId ?? null,
    llmCall.consentGiven ?? true,
    llmCall.consentPurpose ?? 'optimization',
  ];

  const result = await db.query(query, values);
  return rowToEntity(result.rows[0]);
}
