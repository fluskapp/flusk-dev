/**
 * Helper utilities for multi-file repo generation.
 */

import type { QuerySchema } from '../schema/query-schema.types.js';

/** A generated file with path and content */
export interface GeneratedFile {
  /** Filename (e.g., 'create.ts') */
  filename: string;
  /** Full file content */
  content: string;
}

/** Convert camelCase to kebab-case */
export function toKebab(s: string): string {
  return s
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase();
}

/** Normalize queries from array or record format */
export function normalizeQueries(
  queries?: QuerySchema[] | Record<string, QuerySchema>,
): Array<QuerySchema & { name: string }> {
  if (!queries) return [];
  if (Array.isArray(queries)) {
    return queries.filter((q) => q.name) as Array<QuerySchema & { name: string }>;
  }
  return Object.entries(queries).map(([name, q]) => ({ ...q, name }));
}
