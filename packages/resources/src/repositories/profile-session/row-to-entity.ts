import type { ProfileSessionEntity, HotspotEntry } from '@flusk/entities';
import { toISOString } from '../../shared/map-row.js';

/** Convert database row to ProfileSessionEntity */
export function rowToEntity(row: Record<string, unknown>): ProfileSessionEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    name: row.name as string,
    type: row.type as string,
    durationMs: row.duration_ms as number,
    totalSamples: row.total_samples as number,
    hotspots: (typeof row.hotspots === 'string'
      ? JSON.parse(row.hotspots)
      : row.hotspots ?? []) as HotspotEntry[],
    markdownRaw: row.markdown_raw as string,
    pprofPath: row.pprof_path as string,
    flamegraphPath: row.flamegraph_path as string,
    traceIds: (typeof row.trace_ids === 'string'
      ? JSON.parse(row.trace_ids)
      : row.trace_ids ?? []) as string[],
    organizationId: (row.organization_id as string) ?? undefined,
    startedAt: toISOString(row.started_at),
  };
}
