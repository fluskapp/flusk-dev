/** @generated from PromptTemplate YAML — Traits: crud */

import type { PromptTemplateEntity } from '@flusk/entities';
import type { DatabaseSync } from 'node:sqlite';

export type CreatePromptTemplateInput = Omit<PromptTemplateEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePromptTemplateInput = Partial<CreatePromptTemplateInput>;

function toISOString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toISOString' in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}

/** Convert a SQLite row (snake_case) to PromptTemplateEntity (camelCase) */
function rowToEntity(row: Record<string, unknown>): PromptTemplateEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    organizationId: row.organization_id as string,
    name: row.name as string,
    description: row.description as string,
    activeVersionId: (row.active_version_id as string) ?? undefined,
    variables: JSON.parse(row.variables as string),
  };
}

function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }
function convertValueForDb(key: string, value: unknown): unknown {
  if (new Set(['variables']).has(key)) return JSON.stringify(value);
  return value ?? null;
}

export function createPromptTemplate(db: DatabaseSync, data: CreatePromptTemplateInput): PromptTemplateEntity {
  const stmt = db.prepare(`INSERT INTO prompt_templates (organization_id, name, description, active_version_id, variables) VALUES ($1, $2, $3, $4, $5) RETURNING *`);
  const row = stmt.get(data.organizationId, data.name, data.description, data.activeVersionId ?? null, JSON.stringify(data.variables)) as Record<string, unknown>;
  return rowToEntity(row);
}

export function findPromptTemplateById(db: DatabaseSync, id: string): PromptTemplateEntity | null {
  const stmt = db.prepare('SELECT * FROM prompt_templates WHERE id = $1');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function listPromptTemplates(db: DatabaseSync, limit = 50, offset = 0): PromptTemplateEntity[] {
  const stmt = db.prepare('SELECT * FROM prompt_templates ORDER BY created_at DESC LIMIT $1 OFFSET $2');
  return (stmt.all(limit, offset) as Record<string, unknown>[]).map(rowToEntity);
}

export function updatePromptTemplate(db: DatabaseSync, id: string, data: UpdatePromptTemplateInput): PromptTemplateEntity | null {
  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  if (keys.length === 0) return findPromptTemplateById(db, id);
  const sets = keys.map((k) => `${toSnake(k)} = ?`).join(', ');
  const vals = keys.map((k) => convertValueForDb(k, data[k as keyof typeof data]));
  const stmt = db.prepare(`UPDATE prompt_templates SET ${sets} WHERE id = ? RETURNING *`);
  const row = stmt.get(...vals, id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function deletePromptTemplate(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare('DELETE FROM prompt_templates WHERE id = $1');
  return stmt.run(id).changes > 0;
}

// --- BEGIN CUSTOM ---

// --- END CUSTOM ---