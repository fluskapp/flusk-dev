import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
/**
 * Create a new conversion suggestion
 * @param conversion - Partial conversion data (id, timestamps auto-generated)
 * @returns Created conversion entity with generated id and timestamps
 */
export async function create(conversion) {
    const db = getPool();
    const query = `
    INSERT INTO conversions (
      pattern_id, organization_id, conversion_type, status, estimated_savings, config
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
    const result = await db.query(query, values);
    return rowToEntity(result.rows[0]);
}
//# sourceMappingURL=create.js.map