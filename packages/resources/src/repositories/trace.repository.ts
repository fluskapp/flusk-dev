import { getPool } from '../db/pool.js';
import { TraceEntity } from '@flusk/entities';

function rowToEntity(row: any): TraceEntity {
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
  data: Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TraceEntity> {
  const db = getPool();
  const q = `
    INSERT INTO traces (organization_id, name, total_cost, total_tokens,
      total_latency_ms, call_count, status, started_at, completed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`;
  const r = await db.query(q, [
    data.organizationId, data.name, data.totalCost, data.totalTokens,
    data.totalLatencyMs, data.callCount, data.status, data.startedAt,
    data.completedAt ?? null,
  ]);
  return rowToEntity(r.rows[0]);
}

export async function findById(id: string): Promise<TraceEntity | null> {
  const r = await getPool().query('SELECT * FROM traces WHERE id = $1', [id]);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}

export async function findByOrganization(orgId: string): Promise<TraceEntity[]> {
  const r = await getPool().query(
    'SELECT * FROM traces WHERE organization_id = $1 ORDER BY started_at DESC', [orgId]
  );
  return r.rows.map(rowToEntity);
}

export async function updateStats(
  id: string,
  stats: { totalCost: number; totalTokens: number; totalLatencyMs: number; callCount: number }
): Promise<TraceEntity | null> {
  const q = `
    UPDATE traces SET total_cost=$2, total_tokens=$3, total_latency_ms=$4,
      call_count=$5, status='completed', completed_at=NOW(), updated_at=NOW()
    WHERE id=$1 RETURNING *`;
  const r = await getPool().query(q, [
    id, stats.totalCost, stats.totalTokens, stats.totalLatencyMs, stats.callCount,
  ]);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}

export async function update(
  id: string,
  data: Partial<Omit<TraceEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<TraceEntity | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  let i = 1;
  if (data.status) { sets.push(`status = $${i++}`); vals.push(data.status); }
  if (data.completedAt) { sets.push(`completed_at = $${i++}`); vals.push(data.completedAt); }
  if (data.name) { sets.push(`name = $${i++}`); vals.push(data.name); }
  vals.push(id);
  const q = `UPDATE traces SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
  const r = await getPool().query(q, vals);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}
