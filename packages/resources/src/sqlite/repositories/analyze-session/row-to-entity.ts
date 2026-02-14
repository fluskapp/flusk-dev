import type { AnalyzeSessionEntity } from '@flusk/entities';

/**
 * Convert SQLite row to AnalyzeSessionEntity
 */
export function rowToEntity(row: Record<string, unknown>): AnalyzeSessionEntity {
  return {
    id: row.id as string,
    createdAt: row.started_at as string,
    updatedAt: row.started_at as string,
    script: row.script as string,
    durationMs: row.duration_ms as number,
    totalCalls: row.total_calls as number,
    totalCost: row.total_cost as number,
    modelsUsed: JSON.parse(row.models_used as string) as string[],
    startedAt: row.started_at as string,
    completedAt: (row.completed_at as string) ?? undefined,
  };
}
