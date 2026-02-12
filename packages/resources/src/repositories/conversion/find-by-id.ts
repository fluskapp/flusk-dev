import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Find conversion by UUID
 * @param pool - PostgreSQL connection pool
 * @param id - UUID of the conversion
 */
export async function findById(
  pool: Pool,
  id: string
): Promise<ConversionEntity | null> {
  const query = 'SELECT * FROM conversions WHERE id = $1';
  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return rowToEntity(result.rows[0]);
}
