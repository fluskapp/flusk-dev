import { LLMCallEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export interface SimilarResult {
  call: LLMCallEntity;
  similarity: number;
}

/**
 * Find LLM calls with similar embeddings using cosine similarity
 * @param embedding - Query embedding vector (1536-dim)
 * @param threshold - Minimum similarity (0-1, default 0.90)
 * @param limit - Max results (default 20)
 * @returns Calls sorted by similarity descending
 */
export async function findSimilar(
  embedding: number[],
  threshold: number = 0.95,
  limit: number = 20
): Promise<SimilarResult[]> {
  const db = getPool();
  const vectorStr = `[${embedding.join(',')}]`;

  // cosine distance: 1 - cosine_similarity
  // So we want distance < (1 - threshold)
  const maxDistance = 1 - threshold;

  const query = `
    SELECT *, 1 - (embedding <=> $1::vector) AS similarity
    FROM llm_calls
    WHERE embedding IS NOT NULL
      AND (embedding <=> $1::vector) < $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const result = await db.query(query, [vectorStr, maxDistance, limit]);

  return result.rows.map((row: any) => ({
    call: rowToEntity(row),
    similarity: parseFloat(row.similarity),
  }));
}

/**
 * Find calls missing embeddings (for backfill)
 * @param limit - Max results
 */
export async function findWithoutEmbedding(
  limit: number = 100
): Promise<LLMCallEntity[]> {
  const db = getPool();
  const query = `
    SELECT * FROM llm_calls
    WHERE embedding IS NULL
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const result = await db.query(query, [limit]);
  return result.rows.map(rowToEntity);
}
