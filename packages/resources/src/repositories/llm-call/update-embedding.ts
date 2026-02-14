/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

/**
 * Store embedding vector for an LLM call
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the LLM call
 * @param embedding - 1536-dimensional vector
 */
export async function updateEmbedding(
  pool: Pool,
  id: string,
  embedding: number[]
): Promise<void> {
  const vectorStr = `[${embedding.join(',')}]`;

  await pool.query(
    'UPDATE llm_calls SET embedding = $1 WHERE id = $2',
    [vectorStr, id]
  );
}
