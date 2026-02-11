/**
 * Prompt Version Repository — CRUD for immutable prompt versions with metrics tracking.
 */
import { getPool } from '../db/pool.js';
import type { PromptVersionEntity } from '@flusk/entities';

function rowToEntity(row: any): PromptVersionEntity {
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

const DEFAULT_METRICS = { avgQuality: 0, avgLatencyMs: 0, avgCost: 0, sampleCount: 0 };

export async function create(
  data: { templateId: string; content: string; status?: string }
): Promise<PromptVersionEntity> {
  const db = getPool();
  // Auto-increment version per template
  const versionResult = await db.query(
    'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM prompt_versions WHERE template_id = $1',
    [data.templateId]
  );
  const nextVersion = versionResult.rows[0].next_version;

  const result = await db.query(
    `INSERT INTO prompt_versions (template_id, version, content, metrics, status)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.templateId, nextVersion, data.content, JSON.stringify(DEFAULT_METRICS), data.status || 'draft']
  );
  return rowToEntity(result.rows[0]);
}

export async function findById(id: string): Promise<PromptVersionEntity | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM prompt_versions WHERE id = $1', [id]);
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function findByTemplateId(templateId: string): Promise<PromptVersionEntity[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM prompt_versions WHERE template_id = $1 ORDER BY version DESC',
    [templateId]
  );
  return result.rows.map(rowToEntity);
}

export async function update(
  id: string,
  data: Partial<{ status: string; metrics: any }>
): Promise<PromptVersionEntity | null> {
  const db = getPool();
  const sets: string[] = [];
  const vals: any[] = [];
  let idx = 1;

  if (data.status !== undefined) { sets.push(`status = $${idx}`); vals.push(data.status); idx++; }
  if (data.metrics !== undefined) { sets.push(`metrics = $${idx}`); vals.push(JSON.stringify(data.metrics)); idx++; }

  if (sets.length === 0) return findById(id);

  vals.push(id);
  const result = await db.query(
    `UPDATE prompt_versions SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}
