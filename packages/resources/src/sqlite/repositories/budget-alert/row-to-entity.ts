import type { BudgetAlertEntity } from '@flusk/entities';
import { toISOString } from '../../../shared/map-row.js';

/** Convert SQLite row to BudgetAlertEntity */
export function rowToEntity(row: Record<string, unknown>): BudgetAlertEntity {
  return {
    id: row.id as string,
    createdAt: toISOString(row.created_at),
    updatedAt: toISOString(row.updated_at),
    alertType: row.alert_type as BudgetAlertEntity['alertType'],
    threshold: row.threshold as number,
    actual: row.actual as number,
    model: (row.model as string) ?? undefined,
    acknowledged: Boolean(row.acknowledged),
    metadata: row.metadata != null ? JSON.parse(row.metadata as string) : undefined,
  };
}
