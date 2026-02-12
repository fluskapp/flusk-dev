/**
 * Span Repository — CRUD for trace spans.
 * All functions accept a Pool instance as first parameter.
 */
import type { Pool } from 'pg';
import { SpanEntity } from '@flusk/entities';

function rowToEntity(row: any): SpanEntity {
  return {
    id: row.id,
    traceId: row.trace_id,
    parentSpanId: row.parent_span_id ?? null,
    type: row.type,
    name: row.name,
    input: row.input ?? null,
    output: row.output ?? null,
    cost: Number(row.cost),
    tokens: Number(row.tokens),
    latencyMs: Number(row.latency_ms),
    status: row.status,
    startedAt: row.started_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function create(
  pool: Pool,
  data: Omit<SpanEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SpanEntity> {
  const q = `
    INSERT INTO spans (trace_id, parent_span_id, type, name, input, output,
      cost, tokens, latency_ms, status, started_at, completed_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`;
  const r = await pool.query(q, [
    data.traceId, data.parentSpanId ?? null, data.type, data.name,
    data.input ?? null, data.output ?? null, data.cost, data.tokens,
    data.latencyMs, data.status, data.startedAt, data.completedAt ?? null,
  ]);
  return rowToEntity(r.rows[0]);
}

export async function findById(
  pool: Pool, id: string
): Promise<SpanEntity | null> {
  const r = await pool.query('SELECT * FROM spans WHERE id = $1', [id]);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}

export async function findByTrace(
  pool: Pool, traceId: string
): Promise<SpanEntity[]> {
  const r = await pool.query(
    'SELECT * FROM spans WHERE trace_id = $1 ORDER BY started_at ASC',
    [traceId]
  );
  return r.rows.map(rowToEntity);
}

export async function findByParent(
  pool: Pool, parentSpanId: string
): Promise<SpanEntity[]> {
  const r = await pool.query(
    'SELECT * FROM spans WHERE parent_span_id = $1 ORDER BY started_at ASC',
    [parentSpanId]
  );
  return r.rows.map(rowToEntity);
}

export async function update(
  pool: Pool,
  id: string,
  data: Partial<Omit<SpanEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<SpanEntity | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  let i = 1;
  if (data.status) { sets.push(`status = $${i++}`); vals.push(data.status); }
  if (data.completedAt) { sets.push(`completed_at = $${i++}`); vals.push(data.completedAt); }
  if (data.output !== undefined) { sets.push(`output = $${i++}`); vals.push(data.output); }
  if (data.cost !== undefined) { sets.push(`cost = $${i++}`); vals.push(data.cost); }
  if (data.tokens !== undefined) { sets.push(`tokens = $${i++}`); vals.push(data.tokens); }
  if (data.latencyMs !== undefined) { sets.push(`latency_ms = $${i++}`); vals.push(data.latencyMs); }
  vals.push(id);
  const q = `UPDATE spans SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
  const r = await pool.query(q, vals);
  return r.rows.length ? rowToEntity(r.rows[0]) : null;
}
