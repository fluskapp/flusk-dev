import type { Pool } from 'pg';
import { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find LLM call by prompt hash (for cache lookups)
 * @param pool - PostgreSQL connection pool
 * @param hash - SHA-256 hash of the prompt
 * @returns Most recent LLM call with this hash or null
 */
export async function findByPromptHash(
  pool: Pool,
  hash: string
): Promise<LLMCallEntity | null> {
  const query = `
    SELECT * FROM llm_calls
    WHERE prompt_hash = $1
    ORDER BY created_at DESC
    LIMIT 1
  `;

  const result = await pool.query(query, [hash]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
