import type { DatabaseSync } from 'node:sqlite';
import type { AnalyzeSessionEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

/**
 * Update a Analyze session
 */
export function update(
  db: DatabaseSync,
  id: string,
  data: Partial<Omit<AnalyzeSessionEntity, 'id' | 'createdAt' | 'updatedAt'>>,
): AnalyzeSessionEntity | null {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const snake = key.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      sets.push(`${snake} = ?`);
      values.push(JSON.stringify(value) as string);
    } else {
      sets.push(`${snake} = ?`);
      values.push(value as string | number | null);
    }
  }
  if (sets.length === 0) return null;
  values.push(id);
  const stmt = db.prepare(
    `UPDATE analyze_sessions SET ${sets.join(', ')} WHERE id = ? RETURNING *`,
  );
  const row = stmt.get(...values) as Record<string, unknown> | undefined;
  return row ? rowToEntity(row) : null;
}
