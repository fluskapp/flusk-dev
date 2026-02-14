/** @generated from Pattern YAML — Traits: crud */

import type { PatternEntity } from '@flusk/entities';
import type { DatabaseSync } from 'node:sqlite';

export type CreatePatternInput = Omit<PatternEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdatePatternInput = Partial<CreatePatternInput>;

function toISOString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toISOString' in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}

/** Convert a SQLite row (snake_case) to PatternEntity (camelCase) */
function rowToEntity(row: Record<string, unknown>): PatternEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    organizationId: row.organization_id as string,
    promptHash: row.prompt_hash as string,
    occurrenceCount: row.occurrence_count as number,
    firstSeenAt: toISOString(row.first_seen_at),
    lastSeenAt: toISOString(row.last_seen_at),
    samplePrompts: JSON.parse(row.sample_prompts as string),
    avgCost: row.avg_cost as number,
    totalCost: row.total_cost as number,
    suggestedConversion: (row.suggested_conversion as string) ?? undefined,
  };
}

function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }
function convertValueForDb(key: string, value: unknown): unknown {
  if (new Set(['samplePrompts']).has(key)) return JSON.stringify(value);
  return value ?? null;
}

export function createPattern(db: DatabaseSync, data: CreatePatternInput): PatternEntity {
  const stmt = db.prepare(`INSERT INTO patterns (organization_id, prompt_hash, occurrence_count, first_seen_at, last_seen_at, sample_prompts, avg_cost, total_cost, suggested_conversion) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`);
  const row = stmt.get(data.organizationId, data.promptHash, data.occurrenceCount, data.firstSeenAt, data.lastSeenAt, JSON.stringify(data.samplePrompts), data.avgCost, data.totalCost, data.suggestedConversion ?? null) as Record<string, unknown>;
  return rowToEntity(row);
}

export function findPatternById(db: DatabaseSync, id: string): PatternEntity | null {
  const stmt = db.prepare('SELECT * FROM patterns WHERE id = $1');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function listPatterns(db: DatabaseSync, limit = 50, offset = 0): PatternEntity[] {
  const stmt = db.prepare('SELECT * FROM patterns ORDER BY created_at DESC LIMIT $1 OFFSET $2');
  return (stmt.all(limit, offset) as Record<string, unknown>[]).map(rowToEntity);
}

export function updatePattern(db: DatabaseSync, id: string, data: UpdatePatternInput): PatternEntity | null {
  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  if (keys.length === 0) return findPatternById(db, id);
  const sets = keys.map((k) => `${toSnake(k)} = ?`).join(', ');
  const vals = keys.map((k) => convertValueForDb(k, data[k as keyof typeof data]));
  const stmt = db.prepare(`UPDATE patterns SET ${sets} WHERE id = ? RETURNING *`);
  const row = stmt.get(...vals, id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function deletePattern(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare('DELETE FROM patterns WHERE id = $1');
  return stmt.run(id).changes > 0;
}

// --- BEGIN CUSTOM ---

// --- END CUSTOM ---