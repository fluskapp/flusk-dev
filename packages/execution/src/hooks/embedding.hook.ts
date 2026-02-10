import { generateEmbedding } from '@flusk/resources/clients/openai-embedding.client';
import * as LLMCallRepository from '@flusk/resources/repositories/llm-call';

/**
 * Generate and store embedding for a newly created LLM call
 * Runs async (fire-and-forget) to avoid blocking the response
 *
 * @param callId - UUID of the created LLM call
 * @param prompt - Prompt text to embed
 */
export function scheduleEmbedding(callId: string, prompt: string): void {
  if (!process.env.OPENAI_API_KEY) return;

  generateEmbedding(prompt)
    .then((result) => LLMCallRepository.updateEmbedding(callId, result.embedding))
    .catch((err) => {
      console.error(`Embedding failed for ${callId}:`, err.message);
    });
}
