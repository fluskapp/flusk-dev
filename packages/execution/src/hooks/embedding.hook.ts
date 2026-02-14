/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { getLogger } from '@flusk/logger';
import { OpenAIEmbeddingClient } from '@flusk/resources';
import { LLMCallRepository } from '@flusk/resources';

const logger = getLogger().child({ module: 'embedding-hook' });

/**
 * Generate and store embedding for a newly created LLM call
 * Runs async (fire-and-forget) to avoid blocking the response
 *
 * @param pool - PostgreSQL connection pool
 * @param callId - UUID of the created LLM call
 * @param prompt - Prompt text to embed
 */
export function scheduleEmbedding(pool: Pool, callId: string, prompt: string): void {
  if (!process.env.OPENAI_API_KEY) return;

  OpenAIEmbeddingClient.generateEmbedding(prompt)
    .then((result) => LLMCallRepository.updateEmbedding(pool, callId, result.embedding))
    .catch((err) => {
      logger.error({ callId, err }, 'embedding failed');
    });
}
