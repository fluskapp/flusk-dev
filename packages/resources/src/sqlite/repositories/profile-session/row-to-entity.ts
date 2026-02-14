import type { ProfileSessionEntity, HotspotEntry } from '@flusk/entities';

/**
 * Convert SQLite row to ProfileSessionEntity
 */
export function rowToEntity(row: Record<string, unknown>): ProfileSessionEntity {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    name: row.name as string,
    type: row.type as 'cpu' | 'heap',
    durationMs: row.duration_ms as number,
    totalSamples: row.total_samples as number,
    hotspots: JSON.parse(row.hotspots as string) as HotspotEntry[],
    markdownRaw: row.markdown_raw as string,
    pprofPath: row.pprof_path as string,
    flamegraphPath: row.flamegraph_path as string,
    traceIds: JSON.parse(row.trace_ids as string) as string[],
    organizationId: (row.organization_id as string) ?? undefined,
    startedAt: row.started_at as string,
  };
}
