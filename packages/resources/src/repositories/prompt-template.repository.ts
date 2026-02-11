import { getPool } from '../db/pool.js';
import type { PromptTemplateEntity } from '@flusk/entities';

function rowToEntity(row: any): PromptTemplateEntity {
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
  data: Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PromptTemplateEntity> {
  const db = getPool();
  const result = await db.query(
    `INSERT INTO prompt_templates (organization_id, name, description, active_version_id, variables)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.organizationId, data.name, data.description, data.activeVersionId, JSON.stringify(data.variables)]
  );
  return rowToEntity(result.rows[0]);
}

export async function findById(id: string): Promise<PromptTemplateEntity | null> {
  const db = getPool();
  const result = await db.query('SELECT * FROM prompt_templates WHERE id = $1', [id]);
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function findByOrganizationId(orgId: string): Promise<PromptTemplateEntity[]> {
  const db = getPool();
  const result = await db.query(
    'SELECT * FROM prompt_templates WHERE organization_id = $1 ORDER BY created_at DESC', [orgId]
  );
  return result.rows.map(rowToEntity);
}

export async function update(
  id: string,
  data: Partial<Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<PromptTemplateEntity | null> {
  const db = getPool();
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  let idx = 1;

  if (data.name !== undefined) { sets.push(`name = $${idx}`); vals.push(data.name); idx++; }
  if (data.description !== undefined) { sets.push(`description = $${idx}`); vals.push(data.description); idx++; }
  if (data.activeVersionId !== undefined) { sets.push(`active_version_id = $${idx}`); vals.push(data.activeVersionId); idx++; }
  if (data.variables !== undefined) { sets.push(`variables = $${idx}`); vals.push(JSON.stringify(data.variables)); idx++; }

  vals.push(id);
  const result = await db.query(
    `UPDATE prompt_templates SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`, vals
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function deleteById(id: string): Promise<void> {
  const db = getPool();
  await db.query('DELETE FROM prompt_templates WHERE id = $1', [id]);
}
