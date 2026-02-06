import { ConversionEntity } from '@flusk/entities';

/**
 * Convert database row to ConversionEntity
 */
export function rowToEntity(row: any): ConversionEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    patternId: row.pattern_id,
    organizationId: row.organization_id,
    conversionType: row.conversion_type,
    status: row.status,
    estimatedSavings: parseFloat(row.estimated_savings),
    config: row.config
  };
}
