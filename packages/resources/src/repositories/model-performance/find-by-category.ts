import type { ModelPerformanceEntity } from '@flusk/entities';
import { getPool } from './pool.js';
import { rowToEntity } from './row-to-entity.js';

export async function findByCategory(
  promptCategory?: string
): Promise<ModelPerformanceEntity[]> {
  const db = getPool();
  if (promptCategory) {
    const result = await db.query(
      'SELECT * FROM model_performance WHERE prompt_category = $1 ORDER BY avg_cost_per_1k_tokens ASC',
      [promptCategory]
    );
    return result.rows.map(rowToEntity);
  }
  const result = await db.query(
    'SELECT * FROM model_performance ORDER BY model, prompt_category'
  );
  return result.rows.map(rowToEntity);
}
