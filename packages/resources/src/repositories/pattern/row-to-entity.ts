/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { PatternEntity } from '@flusk/entities';

interface PatternRow {
  id: string;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
  organization_id: string;
  prompt_hash: string;
  occurrence_count: number;
  first_seen_at: { toISOString(): string };
  last_seen_at: { toISOString(): string };
  sample_prompts: string[];
  avg_cost: string;
  total_cost: string;
  suggested_conversion: string;
}

/**
 * Convert database row to PatternEntity
 */
export function rowToEntity(row: PatternRow): PatternEntity {
  return {
    id: row.id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    organizationId: row.organization_id,
    promptHash: row.prompt_hash,
    occurrenceCount: row.occurrence_count,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    samplePrompts: row.sample_prompts || [],
    avgCost: parseFloat(row.avg_cost),
    totalCost: parseFloat(row.total_cost),
    suggestedConversion: row.suggested_conversion
  };
}
