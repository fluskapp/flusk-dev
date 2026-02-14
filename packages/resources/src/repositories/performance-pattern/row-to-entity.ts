import { PerformancePatternEntity } from '@flusk/entities';

interface PerformancePatternRow {
  id: string;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
  profile_session_id: string;
  pattern: string;
  severity: string;
  description: string;
  suggestion: string;
  metadata: Record<string, unknown>;
  organization_id?: string;
}

/**
 * Convert database row to PerformancePatternEntity
 */
export function rowToEntity(row: PerformancePatternRow): PerformancePatternEntity {
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
