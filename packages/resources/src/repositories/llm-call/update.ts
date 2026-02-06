import { LLMCallEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
import { findById } from './find-by-id.js';

/**
 * Update LLM call record
 * @param id - UUID of the LLM call to update
 * @param data - Partial data to update
 * @returns Updated LLM call entity or null if not found
 */
export async function update(
  id: string,
  data: Partial<Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<LLMCallEntity | null> {
  const db = getPool();

  const updates: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  // Build dynamic UPDATE query based on provided fields
  if (data.provider !== undefined) {
    updates.push(`provider = $${paramCount++}`);
    values.push(data.provider);
  }
  if (data.model !== undefined) {
    updates.push(`model = $${paramCount++}`);
    values.push(data.model);
  }
  if (data.prompt !== undefined) {
    updates.push(`prompt = $${paramCount++}`);
    values.push(data.prompt);
  }
  if (data.promptHash !== undefined) {
    updates.push(`prompt_hash = $${paramCount++}`);
    values.push(data.promptHash);
  }
  if (data.tokens !== undefined) {
    updates.push(`tokens = $${paramCount++}`);
    values.push(JSON.stringify(data.tokens));
  }
  if (data.cost !== undefined) {
    updates.push(`cost = $${paramCount++}`);
    values.push(data.cost);
  }
  if (data.response !== undefined) {
    updates.push(`response = $${paramCount++}`);
    values.push(data.response);
  }
  if (data.cached !== undefined) {
    updates.push(`cached = $${paramCount++}`);
    values.push(data.cached);
  }

  if (updates.length === 0) {
    // No fields to update, just return existing record
    return findById(id);
  }

  values.push(id);
  const query = `
    UPDATE llm_calls
    SET ${updates.join(', ')}
    WHERE id = $${paramCount}
    RETURNING *
  `;

  const result = await db.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
