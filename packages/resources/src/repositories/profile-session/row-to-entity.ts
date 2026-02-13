import { ProfileSessionEntity, HotspotEntry } from '@flusk/entities';

/**
 * Convert database row to ProfileSessionEntity
 */
export function rowToEntity(row: any): ProfileSessionEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    name: row.name,
    type: row.type,
    durationMs: row.duration_ms,
    totalSamples: row.total_samples,
    hotspots: (row.hotspots ?? []) as HotspotEntry[],
    markdownRaw: row.markdown_raw,
    pprofPath: row.pprof_path,
    flamegraphPath: row.flamegraph_path,
    traceIds: row.trace_ids ?? [],
    organizationId: row.organization_id ?? undefined,
    startedAt: row.started_at.toISOString(),
  };
}
