import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';
import { findById } from './find-by-id.js';
/**
 * Update conversion record
 * @param id - UUID of the conversion to update
 * @param data - Partial data to update
 * @returns Updated conversion entity or null if not found
 */
export async function update(id, data) {
    const db = getPool();
    const updates = [];
    const values = [];
    let paramCount = 1;
    // Build dynamic UPDATE query based on provided fields
    if (data.patternId !== undefined) {
        updates.push(`pattern_id = $${paramCount++}`);
        values.push(data.patternId);
    }
    if (data.organizationId !== undefined) {
        updates.push(`organization_id = $${paramCount++}`);
        values.push(data.organizationId);
    }
    if (data.conversionType !== undefined) {
        updates.push(`conversion_type = $${paramCount++}`);
        values.push(data.conversionType);
    }
    if (data.status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(data.status);
    }
    if (data.estimatedSavings !== undefined) {
        updates.push(`estimated_savings = $${paramCount++}`);
        values.push(data.estimatedSavings);
    }
    if (data.config !== undefined) {
        updates.push(`config = $${paramCount++}`);
        values.push(JSON.stringify(data.config));
    }
    if (updates.length === 0) {
        // No fields to update, just return existing record
        return findById(id);
    }
    values.push(id);
    const query = `
    UPDATE conversions
    SET ${updates.join(', ')}, updated_at = NOW()
    WHERE id = $${paramCount}
    RETURNING *
  `;
    const result = await db.query(query, values);
    if (result.rows.length === 0) {
        return null;
    }
    return rowToEntity(result.rows[0]);
}
//# sourceMappingURL=update.js.map