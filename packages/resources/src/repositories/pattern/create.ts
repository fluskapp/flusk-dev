/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';
import { PatternEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Create a new pattern record
 * @param pool - PostgreSQL connection pool
 * @param pattern - Pattern data (id, timestamps auto-generated)
 */
export async function create(
  pool: Pool,
  pattern: Omit<PatternEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PatternEntity> {
  const query = `
    INSERT INTO patterns (
      organization_id, prompt_hash, occurrence_count,
      first_seen_at, last_seen_at, sample_prompts,
      avg_cost, total_cost, suggested_conversion
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `;

  const values = [
    pattern.organizationId,
    pattern.promptHash,
    pattern.occurrenceCount,
    pattern.firstSeenAt,
    pattern.lastSeenAt,
    pattern.samplePrompts,
    pattern.avgCost,
    pattern.totalCost,
    pattern.suggestedConversion
  ];

  const result = await pool.query(query, values);
  return rowToEntity(result.rows[0]);
}
