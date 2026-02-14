/**
 * Prompt Template Repository — CRUD for prompt templates.
 * All functions accept a Pool instance as first parameter.
 */
import type { Pool } from 'pg';
import type { PromptTemplateEntity } from '@flusk/entities';

interface PtRow {
  id: string; organization_id: string; name: string; description: string;
  active_version_id: string; variables: string[];
  created_at: { toISOString(): string }; updated_at: { toISOString(): string };
}

function rowToEntity(row: PtRow): PromptTemplateEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    activeVersionId: row.active_version_id,
    variables: row.variables || [],
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function create(
  pool: Pool,
  data: Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PromptTemplateEntity> {
  const result = await pool.query(
    `INSERT INTO prompt_templates (organization_id, name, description, active_version_id, variables)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.organizationId, data.name, data.description, data.activeVersionId, JSON.stringify(data.variables)]
  );
  return rowToEntity(result.rows[0]);
}

export async function findById(
  pool: Pool, id: string
): Promise<PromptTemplateEntity | null> {
  const result = await pool.query(
    'SELECT * FROM prompt_templates WHERE id = $1', [id]
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function findByOrganizationId(
  pool: Pool, orgId: string
): Promise<PromptTemplateEntity[]> {
  const result = await pool.query(
    'SELECT * FROM prompt_templates WHERE organization_id = $1 ORDER BY created_at DESC',
    [orgId]
  );
  return result.rows.map(rowToEntity);
}

export async function update(
  pool: Pool,
  id: string,
  data: Partial<Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PromptTemplateEntity | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx}`); vals.push(data.name); idx++; }
  if (data.description !== undefined) { sets.push(`description = $${idx}`); vals.push(data.description); idx++; }
  if (data.activeVersionId !== undefined) { sets.push(`active_version_id = $${idx}`); vals.push(data.activeVersionId); idx++; }
  if (data.variables !== undefined) { sets.push(`variables = $${idx}`); vals.push(JSON.stringify(data.variables)); idx++; }

  vals.push(id);
  const result = await pool.query(
    `UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function deleteById(pool: Pool, id: string): Promise<void> {
  await pool.query('DELETE FROM prompt_templates WHERE id = $1', [id]);
}
