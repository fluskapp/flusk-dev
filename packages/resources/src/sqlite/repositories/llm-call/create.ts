import type { DatabaseSync } from 'node:sqlite';
import type { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Insert a new LLM call record into SQLite
 */
export function create(
  db: DatabaseSync,
  data: Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>,
): LLMCallEntity {
  const stmt = db.prepare(`
    INSERT INTO llm_calls (
      provider, model, prompt, prompt_hash, tokens,
      cost, response, cached, agent_label, organization_id,
      consent_given, consent_purpose
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    RETURNING *
  `);

  const row = stmt.get(
    data.provider,
    data.model,
    data.prompt,
    data.promptHash,
    JSON.stringify(data.tokens),
    data.cost,
    data.response,
    data.cached ? 1 : 0,
    data.agentLabel ?? null,
    data.organizationId ?? null,
    data.consentGiven ? 1 : 0,
    data.consentPurpose,
  ) as Record<string, unknown>;

  return rowToEntity(row);
}
