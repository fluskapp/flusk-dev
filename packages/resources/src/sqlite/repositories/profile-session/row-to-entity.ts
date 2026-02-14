import type { ProfileSessionEntity, Hotspots, TraceIds } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to ProfileSessionEntity */
export function rowToEntity(row: Record<string, unknown>): ProfileSessionEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    name: row.name as string,
    profileType: row.profile_type as string,
    durationMs: row.duration_ms as number,
    totalSamples: row.total_samples as number,
    hotspots: JSON.parse(row.hotspots as string) as Hotspots,
    markdownRaw: row.markdown_raw as string,
    pprofPath: row.pprof_path as string,
    flamegraphPath: row.flamegraph_path as string,
    traceIds: JSON.parse(row.trace_ids as string) as TraceIds,
    organizationId: (row.organization_id as string) ?? undefined,
    startedAt: toISOString(row.started_at),
  };
}
