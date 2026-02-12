import type { Pool } from 'pg';
import { ConversionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Create a new conversion suggestion
 * @param pool - PostgreSQL connection pool
 * @param conversion - Partial conversion data
 */
export async function create(
  pool: Pool,
  conversion: Omit<ConversionEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ConversionEntity> {
  const query = `
    INSERT INTO conversions (
      pattern_id, organization_id, conversion_type,
      status, estimated_savings, config
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `;

  const values = [
    conversion.patternId,
    conversion.organizationId,
    conversion.conversionType,
    conversion.status,
    conversion.estimatedSavings,
    JSON.stringify(conversion.config)
  ];

  const result = await pool.query(query, values);
  return rowToEntity(result.rows[0]);
}
