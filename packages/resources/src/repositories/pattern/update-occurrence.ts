/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update pattern occurrence when a duplicate call is detected
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the pattern to update
 * @param newCost - Cost of the new occurrence
 * @param newPrompt - Optional new sample prompt to add
 */
export async function updateOccurrence(
  pool: Pool,
  id: string,
  newCost: number,
  newPrompt?: string
): Promise<PatternEntity | null> {
  const sampleUpdate = newPrompt
    ? `sample_prompts = array_append(
         CASE WHEN array_length(sample_prompts, 1) >= 5
           THEN sample_prompts[2:5]
           ELSE sample_prompts
         END,
         $3
       )`
    : 'sample_prompts = sample_prompts';

  const query = `
    UPDATE patterns
    SET
      occurrence_count = occurrence_count + 1,
      last_seen_at = NOW(),
      total_cost = total_cost + $2,
      avg_cost = (total_cost + $2) / (occurrence_count + 1),
      ${sampleUpdate}
    WHERE id = $1
    RETURNING *
  `;

  const values = newPrompt ? [id, newCost, newPrompt] : [id, newCost];
  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
