import type { ConversionEntity, Config } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to ConversionEntity */
export function rowToEntity(row: Record<string, unknown>): ConversionEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    patternId: row.pattern_id as string,
    organizationId: row.organization_id as string,
    conversionType: row.conversion_type as string,
    status: row.status as string,
    estimatedSavings: row.estimated_savings as number,
    config: JSON.parse(row.config as string) as Config,
  };
}
