/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { LLMCallEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find LLM call by UUID
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the LLM call
 * @returns LLM call entity or null if not found
 */
export async function findById(
  pool: Pool,
  id: string
): Promise<LLMCallEntity | null> {
  const query = 'SELECT * FROM llm_calls WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
