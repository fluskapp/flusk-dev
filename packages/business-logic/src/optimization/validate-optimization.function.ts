/**
 * Validate optimization entity data
 * Pure function — no I/O
 */

const VALID_TYPES = ['cache-config', 'model-swap', 'prompt-dedup', 'batch-merge'] as const;
const VALID_LANGUAGES = ['typescript', 'python', 'json'] as const;
const VALID_STATUSES = ['suggested', 'applied', 'dismissed'] as const;

export interface OptimizationInput {
  organizationId?: string;
  type?: string;
  title?: string;
  description?: string;
  estimatedSavingsPerMonth?: number;
  generatedCode?: string;
  language?: string;
  status?: string;
}

export function validateOptimization(
  entity: OptimizationInput
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entity.organizationId) errors.push('organizationId is required');
  if (!entity.type) errors.push('type is required');
  else if (!VALID_TYPES.includes(entity.type as any)) {
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }
  if (!entity.title) errors.push('title is required');
  if (!entity.generatedCode) errors.push('generatedCode is required');
  if (entity.language && !VALID_LANGUAGES.includes(entity.language as any)) {
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }
  if (entity.status && !VALID_STATUSES.includes(entity.status as any)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
