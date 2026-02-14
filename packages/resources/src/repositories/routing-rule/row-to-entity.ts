/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import type { RoutingRuleEntity } from '@flusk/entities';

export function rowToEntity(row: Record<string, unknown>): RoutingRuleEntity {
  return {
    id: row.id as string,
    organizationId: row.organization_id as string,
    name: row.name as string,
    qualityThreshold: Number(row.quality_threshold),
    fallbackModel: row.fallback_model as string,
    enabled: row.enabled as boolean,
    createdAt: (row.created_at as Date).toISOString(),
    updatedAt: (row.updated_at as Date).toISOString(),
  };
}
