import { ProfileSessionEntity, HotspotEntry } from '@flusk/entities';

interface ProfileSessionRow {
  id: string;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
  name: string;
  type: string;
  duration_ms: number;
  total_samples: number;
  hotspots: HotspotEntry[];
  markdown_raw: string;
  pprof_path: string;
  flamegraph_path: string;
  trace_ids: string[];
  organization_id?: string;
  started_at: { toISOString(): string };
}

/**
 * Convert database row to ProfileSessionEntity
 */
export function rowToEntity(row: ProfileSessionRow): ProfileSessionEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    name: row.name,
    type: row.type,
    durationMs: row.duration_ms,
    totalSamples: row.total_samples,
    hotspots: row.hotspots ?? [],
    markdownRaw: row.markdown_raw,
    pprofPath: row.pprof_path,
    flamegraphPath: row.flamegraph_path,
    traceIds: row.trace_ids ?? [],
    organizationId: row.organization_id ?? undefined,
    startedAt: row.started_at.toISOString(),
  };
}
