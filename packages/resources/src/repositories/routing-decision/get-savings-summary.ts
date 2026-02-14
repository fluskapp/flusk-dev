/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { Pool } from 'pg';

export interface SavingsSummary {
  ruleId: string;
  totalSaved: number;
  decisionCount: number;
  avgSavedPerCall: number;
}

export async function getSavingsSummary(
  pool: Pool,
  ruleId: string
): Promise<SavingsSummary> {
  const result = await pool.query(
    `SELECT
      COUNT(*)::int as decision_count,
      COALESCE(SUM(cost_saved), 0) as total_saved,
      COALESCE(AVG(cost_saved), 0) as avg_saved
    FROM routing_decisions WHERE rule_id = $1`,
    [ruleId]
  );
  const row = result.rows[0];
  return {
    ruleId,
    totalSaved: Number(row.total_saved),
    decisionCount: Number(row.decision_count),
    avgSavedPerCall: Number(row.avg_saved),
  };
}
