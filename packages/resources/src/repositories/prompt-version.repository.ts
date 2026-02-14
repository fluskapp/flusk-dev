/**
 * Prompt Version Repository — CRUD for immutable prompt versions.
 * All functions accept a Pool instance as first parameter.
 */
import type { Pool } from 'pg';
import type { PromptVersionEntity } from '@flusk/entities';

interface PvRow {
  id: string; template_id: string; version: number; content: string;
  metrics: string | Record<string, unknown>; status: string;
  created_at: { toISOString(): string };
}

function rowToEntity(row: PvRow): PromptVersionEntity {
  return {
    id: row.id,
    templateId: row.template_id,
    version: row.version,
    content: row.content,
    metrics: typeof row.metrics === 'string' ? JSON.parse(row.metrics) : row.metrics,
    status: row.status,
    createdAt: row.created_at.toISOString(),
  };
}

const DEFAULT_METRICS = {
  avgQuality: 0, avgLatencyMs: 0, avgCost: 0, sampleCount: 0,
};

export async function create(
  pool: Pool,
  data: { templateId: string; content: string; status?: string }
): Promise<PromptVersionEntity> {
  const versionResult = await pool.query(
    'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM prompt_versions WHERE template_id = $1',
    [data.templateId]
  );
  const nextVersion = versionResult.rows[0].next_version;

  const result = await pool.query(
    `INSERT INTO prompt_versions (template_id, version, content, metrics, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.templateId, nextVersion, data.content, JSON.stringify(DEFAULT_METRICS), data.status || 'draft']
  );
  return rowToEntity(result.rows[0]);
}

export async function findById(
  pool: Pool, id: string
): Promise<PromptVersionEntity | null> {
  const result = await pool.query(
    'SELECT * FROM prompt_versions WHERE id = $1', [id]
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function findByTemplateId(
  pool: Pool, templateId: string
): Promise<PromptVersionEntity[]> {
  const result = await pool.query(
    'SELECT * FROM prompt_versions WHERE template_id = $1 ORDER BY version DESC',
    [templateId]
  );
  return result.rows.map(rowToEntity);
}

export async function update(
  pool: Pool,
  id: string,
  data: Partial<{ status: string; metrics: Record<string, unknown> }>
): Promise<PromptVersionEntity | null> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  let idx = 1;

  if (data.status !== undefined) { sets.push(`status = $${idx}`); vals.push(data.status); idx++; }
  if (data.metrics !== undefined) { sets.push(`metrics = $${idx}`); vals.push(JSON.stringify(data.metrics)); idx++; }

  if (sets.length === 0) return findById(pool, id);

  vals.push(id);
  const result = await pool.query(
    `UPDATE prompt_versions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}
