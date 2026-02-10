import { getPool } from './pool.js';

/**
 * Store embedding vector for an LLM call
 * @param id - UUID of the LLM call
 * @param embedding - 1536-dimensional vector
 */
export async function updateEmbedding(
  id: string,
  embedding: number[]
): Promise<void> {
  const db = getPool();
  const vectorStr = `[${embedding.join(',')}]`;

  await db.query(
    'UPDATE llm_calls SET embedding = $1 WHERE id = $2',
    [vectorStr, id]
  );
}
