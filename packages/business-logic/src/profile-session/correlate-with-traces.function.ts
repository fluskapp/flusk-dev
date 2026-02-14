/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { ProfileSessionEntity, LLMCallEntity, HotspotEntry } from '@flusk/entities';

export type CorrelationResult = {
  llmCall: LLMCallEntity;
  relatedHotspots: HotspotEntry[];
};

/**
 * Correlate a profile session with LLM calls that occurred during
 * the profiling window. Returns matched calls with overlapping hotspots.
 */
export async function correlateWithTraces(
  pool: Pool,
  session: ProfileSessionEntity
): Promise<CorrelationResult[]> {
  const startTime = session.startedAt;
  const endMs = new Date(session.startedAt).getTime() + session.durationMs;
  const endTime = new Date(endMs).toISOString();

  const query = `
    SELECT * FROM llm_calls
    WHERE created_at BETWEEN $1 AND $2
    ORDER BY created_at ASC
  `;

  const result = await pool.query(query, [startTime, endTime]);

  return result.rows.map((row) => ({
    llmCall: {
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
      consentPurpose: row.consent_purpose ?? 'optimization',
    } as LLMCallEntity,
    relatedHotspots: session.hotspots,
  }));
}
