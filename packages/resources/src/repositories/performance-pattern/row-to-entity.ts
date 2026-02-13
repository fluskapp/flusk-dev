import { PerformancePatternEntity } from '@flusk/entities';

/**
 * Convert database row to PerformancePatternEntity
 */
export function rowToEntity(row: any): PerformancePatternEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    profileSessionId: row.profile_session_id,
    pattern: row.pattern,
    severity: row.severity,
    description: row.description,
    suggestion: row.suggestion,
    metadata: row.metadata ?? {},
    organizationId: row.organization_id ?? undefined,
  };
}
