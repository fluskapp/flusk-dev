/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

export interface SimilarResult {
  call: LLMCallEntity;
  similarity: number;
}

/**
 * Find LLM calls with similar embeddings using cosine similarity
 * @param pool - PostgreSQL connection pool
 * @param embedding - Query embedding vector (1536-dim)
 * @param threshold - Minimum similarity (0-1, default 0.95)
 * @param limit - Max results (default 20)
 */
export async function findSimilar(
  pool: Pool,
  embedding: number[],
  threshold: number = 0.95,
  limit: number = 20
): Promise<SimilarResult[]> {
  const vectorStr = `[${embedding.join(',')}]`;
  const maxDistance = 1 - threshold;

  const query = `
    SELECT *, 1 - (embedding <=> $1::vector) AS similarity
    FROM llm_calls
    WHERE embedding IS NOT NULL
      AND (embedding <=> $1::vector) < $2
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const result = await pool.query(query, [vectorStr, maxDistance, limit]);

  return result.rows.map((row: Record<string, unknown>) => ({
    call: rowToEntity(row as Parameters<typeof rowToEntity>[0]),
    similarity: parseFloat(row.similarity as string),
  }));
}

/**
 * Find calls missing embeddings (for backfill)
 * @param pool - PostgreSQL connection pool
 * @param limit - Max results
 */
export async function findWithoutEmbedding(
  pool: Pool,
  limit: number = 100
): Promise<LLMCallEntity[]> {
  const query = `
    SELECT * FROM llm_calls
    WHERE embedding IS NULL
    ORDER BY created_at DESC
    LIMIT $1
  `;
  const result = await pool.query(query, [limit]);
  return result.rows.map(rowToEntity);
}
