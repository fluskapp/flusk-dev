import { ConversionEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find all conversions for a specific pattern
 * @param patternId - UUID of the pattern
 * @returns Array of conversion entities
 */
export async function findByPattern(patternId: string): Promise<ConversionEntity[]> {
  const db = getPool();

  const query = `
    SELECT * FROM conversions
    WHERE pattern_id = $1
    ORDER BY created_at DESC
  `;

  const result = await db.query(query, [patternId]);
  return result.rows.map(rowToEntity);
}
