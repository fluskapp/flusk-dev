/**
 * Trace Repository — CRUD for distributed trace records.
 * All functions accept a Pool instance as first parameter.
 */
import type { Pool } from 'pg';
import { TraceEntity } from '@flusk/entities';

interface TraceRow {
  id: string; organization_id: string; name: string; total_cost: string;
  total_tokens: string; total_latency_ms: string; call_count: string; status: string;
  started_at: { toISOString(): string }; completed_at?: { toISOString(): string };
  created_at: { toISOString(): string }; updated_at: { toISOString(): string };
}

function rowToEntity(row: TraceRow): TraceEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    totalCost: Number(row.total_cost),
    totalTokens: Number(row.total_tokens),
    totalLatencyMs: Number(row.total_latency_ms),
    callCount: Number(row.call_count),
    status: row.status,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function create(
  pool: Pool,
  data: Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TraceEntity> {
  const q = `
    INSERT INTO traces (organization_id, name, total_cost, total_tokens,
      total_latency_ms, call_count, status, started_at, completed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const r = await pool.query(q, [
    data.organizationId, data.name, data.totalCost, data.totalTokens,
    data.totalLatencyMs, data.callCount, data.status, data.startedAt,
    data.completedAt ?? null,
  ]);
  return rowToEntity(r.rows[0]);
}

export async function findById(
  pool: Pool, id: string
): Promise<TraceEntity | null> {
  const r = await pool.query('SELECT * FROM traces WHERE id = $1', [id]);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}

export async function findByOrganization(
  pool: Pool, orgId: string
): Promise<TraceEntity[]> {
  const r = await pool.query(
    'SELECT * FROM traces WHERE organization_id = $1 ORDER BY started_at DESC',
    [orgId]
  );
  return r.rows.map(rowToEntity);
}

export async function updateStats(
  pool: Pool,
  id: string,
  stats: { totalCost: number; totalTokens: number; totalLatencyMs: number; callCount: number }
): Promise<TraceEntity | null> {
  const q = `
    UPDATE traces SET total_cost=$2, total_tokens=$3, total_latency_ms=$4,
      call_count=$5, status='completed', completed_at=NOW(), updated_at=NOW()
    WHERE id=$1 RETURNING *`;
  const r = await pool.query(q, [
    id, stats.totalCost, stats.totalTokens, stats.totalLatencyMs, stats.callCount,
  ]);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}

export async function update(
  pool: Pool,
  id: string,
  data: Partial<Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TraceEntity | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];
  let i = 1;
  if (data.status) { sets.push(`status = $${i++}`); vals.push(data.status); }
  if (data.completedAt) { sets.push(`completed_at = $${i++}`); vals.push(data.completedAt); }
  if (data.name) { sets.push(`name = $${i++}`); vals.push(data.name); }
  vals.push(id);
  const q = `UPDATE traces SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
  const r = await pool.query(q, vals);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}
