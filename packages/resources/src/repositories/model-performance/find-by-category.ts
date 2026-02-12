import type { Pool } from 'pg';
import type { ModelPerformanceEntity } from '@flusk/entities';
import { rowToEntity } from './row-to-entity.js';

export async function findByCategory(
  pool: Pool,
  promptCategory?: string
): Promise<ModelPerformanceEntity[]> {
  if (promptCategory) {
    const result = await pool.query(
      'SELECT * FROM model_performance WHERE prompt_category = $1 ORDER BY avg_cost_per_1k_tokens ASC',
      [promptCategory]
    );
    return result.rows.map(rowToEntity);
  }
  const result = await pool.query(
    'SELECT * FROM model_performance ORDER BY model, prompt_category'
  );
  return result.rows.map(rowToEntity);
}
