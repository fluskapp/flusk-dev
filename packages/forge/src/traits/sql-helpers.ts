/**
 * SQL generation helpers for storage-specific trait output.
 *
 * WHY: SQLite and Postgres have different SQL syntax for common
 * operations. This centralizes the differences so traits can
 * request SQL without caring about the storage target.
 */

import type { StorageTarget } from '../schema/index.js';

/** Generate a parameterized placeholder for a given index */
export function placeholder(
  target: StorageTarget,
  index: number,
): string {
  return target === 'postgres' ? `$${index}` : '?';
}

/** Generate UUID default expression */
export function uuidDefault(target: StorageTarget): string {
  return target === 'postgres'
    ? 'gen_random_uuid()'
    : "lower(hex(randomblob(16)))";
}

/** Generate current timestamp expression */
export function nowExpr(target: StorageTarget): string {
  return target === 'postgres' ? 'NOW()' : "datetime('now')";
}

/** Generate RETURNING clause (supported by both) */
export function returning(columns: string): string {
  return `RETURNING ${columns}`;
}

/** Generate pagination clause */
export function paginationClause(
  target: StorageTarget,
  limitIdx: number,
  offsetIdx: number,
): string {
  const l = placeholder(target, limitIdx);
  const o = placeholder(target, offsetIdx);
  return `LIMIT ${l} OFFSET ${o}`;
}

/** Generate timestamp column type */
export function timestampType(target: StorageTarget): string {
  return target === 'postgres' ? 'TIMESTAMPTZ' : 'TEXT';
}

/** Generate COALESCE for soft-delete filter */
export function softDeleteFilter(col: string): string {
  return `${col} IS NULL`;
}
