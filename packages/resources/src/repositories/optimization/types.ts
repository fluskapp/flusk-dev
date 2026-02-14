/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

export interface OptimizationRow {
  id: string;
  organization_id: string;
  type: string;
  title: string;
  description: string;
  estimated_savings_per_month: string;
  generated_code: string;
  language: string;
  status: string;
  source_pattern_id: string | null;
  created_at: { toISOString(): string };
  updated_at: { toISOString(): string };
}
