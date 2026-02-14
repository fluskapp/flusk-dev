/**
 * Optimization Repository — CRUD for generated code optimization suggestions.
 * All functions accept a Pool instance as first parameter.
 */
import type { Pool } from 'pg';
import type { OptimizationEntity } from '@flusk/entities';
import type { OptimizationRow } from './optimization/types.js';

function rowToEntity(row: OptimizationRow): OptimizationEntity {
  return {
    id: row.id,
    organizationId: row.organization_id,
    type: row.type,
    title: row.title,
    description: row.description,
    estimatedSavingsPerMonth: parseFloat(row.estimated_savings_per_month),
    generatedCode: row.generated_code,
    language: row.language,
    status: row.status,
    sourcePatternId: row.source_pattern_id ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function create(
  pool: Pool,
  data: Omit<OptimizationEntity, 'id' | 'createdAt' | 'updatedAt'>
): Promise<OptimizationEntity> {
  const q = `
    INSERT INTO optimizations (
      organization_id, type, title, description,
      estimated_savings_per_month, generated_code, language,
      status, source_pattern_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    RETURNING *`;
  const vals = [
    data.organizationId, data.type, data.title, data.description,
    data.estimatedSavingsPerMonth, data.generatedCode, data.language,
    data.status, data.sourcePatternId,
  ];
  const result = await pool.query(q, vals);
  return rowToEntity(result.rows[0]);
}

export async function findById(
  pool: Pool,
  id: string
): Promise<OptimizationEntity | null> {
  const result = await pool.query(
    'SELECT * FROM optimizations WHERE id = $1',
    [id]
  );
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function findByOrg(
  pool: Pool,
  orgId: string
): Promise<OptimizationEntity[]> {
  const result = await pool.query(
    'SELECT * FROM optimizations WHERE organization_id = $1 ORDER BY created_at DESC',
    [orgId]
  );
  return result.rows.map(rowToEntity);
}

export async function update(
  pool: Pool,
  id: string,
  data: Partial<Omit<OptimizationEntity, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<OptimizationEntity | null> {
  const sets: string[] = ['updated_at = NOW()'];
  const vals: unknown[] = [];
  let i = 1;

  if (data.status !== undefined) {
    sets.push(`status = $${i++}`); vals.push(data.status);
  }
  if (data.title !== undefined) {
    sets.push(`title = $${i++}`); vals.push(data.title);
  }

  vals.push(id);
  const q = `UPDATE optimizations SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`;
  const result = await pool.query(q, vals);
  return result.rows.length ? rowToEntity(result.rows[0]) : null;
}

export async function generateForOrg(
  pool: Pool,
  orgId: string
): Promise<OptimizationEntity[]> {
  return findByOrg(pool, orgId);
}
