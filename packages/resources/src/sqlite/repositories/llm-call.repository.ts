/**
 * @generated from packages/schema/entities/llm-call.entity.yaml
 * Hash: 246a8a696c52e028c91354ebc15896a2f70e96542315a70258b1339b8d3b515c
 * Generated: 2026-02-23T08:08:01.286Z
 * DO NOT EDIT generated sections — changes will be overwritten.
 */

// --- BEGIN GENERATED (do not edit) [repository] ---
/** @generated from LLMCall YAML — Traits: crud, aggregation, time-range */

import type { LLMCallEntity } from '@flusk/entities';
import type { DatabaseSync } from 'node:sqlite';

export type CreateLLMCallInput = Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateLLMCallInput = Partial<CreateLLMCallInput>;
export interface LLMCallModelCount { model: string; count: number; }
export interface LLMCallPromptHashCount { promptHash: string; count: number; }
export interface LLMCallSessionIdCount { sessionId: string; count: number; }
export interface LLMCallAggregateOptions { op: 'sum' | 'avg' | 'count' | 'min' | 'max'; field: 'cost'; groupBy?: string; }
export interface LLMCallAggregateResult { value: number; group?: string; }

function toISOString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toISOString' in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}

/** Convert a SQLite row (snake_case) to LLMCallEntity (camelCase) */
function rowToEntity(row: Record<string, unknown>): LLMCallEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    provider: row.provider as string,
    model: row.model as string,
    prompt: row.prompt as string,
    promptHash: row.prompt_hash as string,
    tokens: JSON.parse(row.tokens as string),
    cost: row.cost as number,
    response: row.response as string,
    cached: Boolean(row.cached),
    status: row.status as string,
    errorMessage: (row.error_message as string) ?? undefined,
    agentLabel: (row.agent_label as string) ?? undefined,
    organizationId: (row.organization_id as string) ?? undefined,
    consentGiven: Boolean(row.consent_given),
    consentPurpose: row.consent_purpose as string,
    sessionId: (row.session_id as string) ?? undefined,
  };
}

function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }
function convertValueForDb(key: string, value: unknown): null | number | bigint | string {
  if (new Set(['tokens']).has(key)) return JSON.stringify(value);
  if (new Set(['cached', 'consentGiven']).has(key)) return value ? 1 : 0;
  return (value ?? null) as null | number | bigint | string;
}

export function createLLMCall(db: DatabaseSync, data: CreateLLMCallInput): LLMCallEntity {
  const stmt = db.prepare(`INSERT INTO llm_calls (provider, model, prompt, prompt_hash, tokens, cost, response, cached, status, error_message, agent_label, organization_id, consent_given, consent_purpose, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`);
  const row = stmt.get(data.provider, data.model, data.prompt, data.promptHash, JSON.stringify(data.tokens), data.cost, data.response, data.cached ? 1 : 0, data.status, data.errorMessage ?? null, data.agentLabel ?? null, data.organizationId ?? null, data.consentGiven ? 1 : 0, data.consentPurpose, data.sessionId ?? null) as Record<string, unknown>;
  return rowToEntity(row);
}

export function findLLMCallById(db: DatabaseSync, id: string): LLMCallEntity | null {
  const stmt = db.prepare('SELECT * FROM llm_calls WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function listLLMCalls(db: DatabaseSync, limit = 50, offset = 0): LLMCallEntity[] {
  const stmt = db.prepare('SELECT * FROM llm_calls ORDER BY created_at DESC LIMIT ? OFFSET ?');
  return (stmt.all(limit, offset) as Record<string, unknown>[]).map(rowToEntity);
}

export function updateLLMCall(db: DatabaseSync, id: string, data: UpdateLLMCallInput): LLMCallEntity | null {
  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  if (keys.length === 0) return findLLMCallById(db, id);
  const sets = keys.map((k) => `${toSnake(k)} = ?`).join(', ');
  const vals = keys.map((k) => convertValueForDb(k, data[k as keyof typeof data]));
  const stmt = db.prepare(`UPDATE llm_calls SET ${sets} WHERE id = ? RETURNING *`);
  const row = stmt.get(...(vals as (null | number | bigint | string)[]), id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function deleteLLMCall(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare('DELETE FROM llm_calls WHERE id = ?');
  return stmt.run(id).changes > 0;
}

/** Count LLMCall records grouped by model */
export function countByModel(db: DatabaseSync): LLMCallModelCount[] {
  const stmt = db.prepare('SELECT model, COUNT(*) as count FROM llm_calls GROUP BY model ORDER BY count DESC');
  return stmt.all() as unknown as LLMCallModelCount[];
}

/** Count LLMCall records grouped by promptHash */
export function countByPromptHash(db: DatabaseSync): LLMCallPromptHashCount[] {
  const stmt = db.prepare('SELECT prompt_hash, COUNT(*) as count FROM llm_calls GROUP BY prompt_hash ORDER BY count DESC');
  return stmt.all() as unknown as LLMCallPromptHashCount[];
}

/** Count LLMCall records grouped by sessionId */
export function countBySessionId(db: DatabaseSync): LLMCallSessionIdCount[] {
  const stmt = db.prepare('SELECT session_id, COUNT(*) as count FROM llm_calls GROUP BY session_id ORDER BY count DESC');
  return stmt.all() as unknown as LLMCallSessionIdCount[];
}

/** Sum total cost of all LLMCall records */
export function sumCost(db: DatabaseSync): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM llm_calls');
  const row = stmt.get() as { total: number };
  return row.total;
}
/** Sum cost since a given ISO date */
export function sumCostSince(db: DatabaseSync, since: string): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM llm_calls WHERE created_at >= ?');
  const row = stmt.get(since) as { total: number };
  return row.total;
}

/** Run an aggregate query on LLMCall */
export function aggregateLLMCalls(db: DatabaseSync, opts: LLMCallAggregateOptions): LLMCallAggregateResult[] {
  const col = opts.field.replace(/[^a-z_]/gi, ''); const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol ? `${groupCol} as "group", ${fn}(${col}) as value` : `COALESCE(${fn}(${col}), 0) as value`;
  const groupClause = groupCol ? `GROUP BY ${groupCol}` : '';
  return db.prepare(`SELECT ${select} FROM llm_calls ${groupClause}`).all() as unknown as LLMCallAggregateResult[];
}

/** Find LLMCall records within a time range */
export function findLLMCallsByTimeRange(
  db: DatabaseSync, from: string, to: string,
): LLMCallEntity[] {
  const stmt = db.prepare(
    `SELECT * FROM llm_calls WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
  );
  const rows = stmt.all(from, to) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}
// --- END GENERATED ---

// --- BEGIN CUSTOM [repository] ---

// --- END CUSTOM ---