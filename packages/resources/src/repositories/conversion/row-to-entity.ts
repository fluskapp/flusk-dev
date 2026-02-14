/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { ConversionEntity } from '@flusk/entities';

interface ConversionRow {
  id: string;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
  pattern_id: string;
  organization_id: string;
  conversion_type: string;
  status: string;
  estimated_savings: string;
  config: string;
}

/**
 * Convert database row to ConversionEntity
 */
export function rowToEntity(row: ConversionRow): ConversionEntity {
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
