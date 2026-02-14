/** @generated from BudgetAlert YAML — Traits: crud, time-range, aggregation */

import type { BudgetAlertEntity } from '@flusk/entities';
import type { DatabaseSync } from 'node:sqlite';

export type CreateBudgetAlertInput = Omit<BudgetAlertEntity, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBudgetAlertInput = Partial<CreateBudgetAlertInput>;
export interface BudgetAlertModelCount { model: string; count: number; }
export interface BudgetAlertAggregateOptions { op: 'sum' | 'avg' | 'count' | 'min' | 'max'; field: 'threshold' | 'actual'; groupBy?: string; }
export interface BudgetAlertAggregateResult { value: number; group?: string; }

function toISOString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'toISOString' in value) {
    return (value as { toISOString(): string }).toISOString();
  }
  return String(value);
}

/** Convert a SQLite row (snake_case) to BudgetAlertEntity (camelCase) */
function rowToEntity(row: Record<string, unknown>): BudgetAlertEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    alertType: row.alert_type as string,
    threshold: row.threshold as number,
    actual: row.actual as number,
    model: (row.model as string) ?? undefined,
    acknowledged: Boolean(row.acknowledged),
    metadata: row.metadata != null ? JSON.parse(row.metadata as string) : undefined,
  };
}

function toSnake(s: string): string { return s.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase(); }
function convertValueForDb(key: string, value: unknown): unknown {
  if (new Set(['metadata']).has(key)) return JSON.stringify(value);
  if (new Set(['acknowledged']).has(key)) return value ? 1 : 0;
  return value ?? null;
}

export function createBudgetAlert(db: DatabaseSync, data: CreateBudgetAlertInput): BudgetAlertEntity {
  const stmt = db.prepare(`INSERT INTO budget_alerts (alert_type, threshold, actual, model, acknowledged, metadata) VALUES (?, ?, ?, ?, ?, ?) RETURNING *`);
  const row = stmt.get(data.alertType, data.threshold, data.actual, data.model ?? null, data.acknowledged ? 1 : 0, data.metadata != null ? JSON.stringify(data.metadata) : null) as Record<string, unknown>;
  return rowToEntity(row);
}

export function findBudgetAlertById(db: DatabaseSync, id: string): BudgetAlertEntity | null {
  const stmt = db.prepare('SELECT * FROM budget_alerts WHERE id = ?');
  const row = stmt.get(id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function listBudgetAlerts(db: DatabaseSync, limit = 50, offset = 0): BudgetAlertEntity[] {
  const stmt = db.prepare('SELECT * FROM budget_alerts ORDER BY created_at DESC LIMIT ? OFFSET ?');
  return (stmt.all(limit, offset) as Record<string, unknown>[]).map(rowToEntity);
}

export function updateBudgetAlert(db: DatabaseSync, id: string, data: UpdateBudgetAlertInput): BudgetAlertEntity | null {
  const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined);
  if (keys.length === 0) return findBudgetAlertById(db, id);
  const sets = keys.map((k) => `${toSnake(k)} = ?`).join(', ');
  const vals = keys.map((k) => convertValueForDb(k, data[k as keyof typeof data]));
  const stmt = db.prepare(`UPDATE budget_alerts SET ${sets} WHERE id = ? RETURNING *`);
  const row = stmt.get(...vals, id) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}

export function deleteBudgetAlert(db: DatabaseSync, id: string): boolean {
  const stmt = db.prepare('DELETE FROM budget_alerts WHERE id = ?');
  return stmt.run(id).changes > 0;
}

/** Find BudgetAlert records within a time range */
export function findBudgetAlertsByTimeRange(
  db: DatabaseSync, from: string, to: string,
): BudgetAlertEntity[] {
  const stmt = db.prepare(
    `SELECT * FROM budget_alerts WHERE created_at >= ? AND created_at <= ? ORDER BY created_at DESC`,
  );
  const rows = stmt.all(from, to) as Record<string, unknown>[];
  return rows.map(rowToEntity);
}

/** Count BudgetAlert records grouped by model */
export function countByModel(db: DatabaseSync): BudgetAlertModelCount[] {
  const stmt = db.prepare('SELECT model, COUNT(*) as count FROM budget_alerts GROUP BY model ORDER BY count DESC');
  return stmt.all() as BudgetAlertModelCount[];
}

/** Sum total threshold of all BudgetAlert records */
export function sumThreshold(db: DatabaseSync): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(threshold), 0) as total FROM budget_alerts');
  const row = stmt.get() as { total: number };
  return row.total;
}
/** Sum threshold since a given ISO date */
export function sumThresholdSince(db: DatabaseSync, since: string): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(threshold), 0) as total FROM budget_alerts WHERE created_at >= ?');
  const row = stmt.get(since) as { total: number };
  return row.total;
}

/** Sum total actual of all BudgetAlert records */
export function sumActual(db: DatabaseSync): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(actual), 0) as total FROM budget_alerts');
  const row = stmt.get() as { total: number };
  return row.total;
}
/** Sum actual since a given ISO date */
export function sumActualSince(db: DatabaseSync, since: string): number {
  const stmt = db.prepare('SELECT COALESCE(SUM(actual), 0) as total FROM budget_alerts WHERE created_at >= ?');
  const row = stmt.get(since) as { total: number };
  return row.total;
}

/** Run an aggregate query on BudgetAlert */
export function aggregateBudgetAlerts(db: DatabaseSync, opts: BudgetAlertAggregateOptions): BudgetAlertAggregateResult[] {
  const col = opts.field.replace(/[^a-z_]/gi, ''); const fn = opts.op.toUpperCase();
  const groupCol = opts.groupBy?.replace(/[^a-z_]/gi, '');
  const select = groupCol ? `${groupCol} as "group", ${fn}(${col}) as value` : `COALESCE(${fn}(${col}), 0) as value`;
  const groupClause = groupCol ? `GROUP BY ${groupCol}` : '';
  return db.prepare(`SELECT ${select} FROM budget_alerts ${groupClause}`).all() as BudgetAlertAggregateResult[];
}

// --- BEGIN CUSTOM ---

// --- END CUSTOM ---