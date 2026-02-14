import type { PerformancePatternEntity } from '@flusk/entities';

/**
 * Convert SQLite row to PerformancePatternEntity
 */
export function rowToEntity(row: Record<string, unknown>): PerformancePatternEntity {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    profileSessionId: row.profile_session_id as string,
    pattern: row.pattern as string,
    severity: row.severity as 'critical' | 'high' | 'medium' | 'low',
    description: row.description as string,
    suggestion: row.suggestion as string,
    metadata: JSON.parse(row.metadata as string) as Record<string, unknown>,
    organizationId: (row.organization_id as string) ?? undefined,
  };
}
