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
  else if (!(VALID_TYPES as readonly string[]).includes(entity.type)) {
    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  }
  if (!entity.title) errors.push('title is required');
  if (!entity.generatedCode) errors.push('generatedCode is required');
  if (entity.language && !(VALID_LANGUAGES as readonly string[]).includes(entity.language)) {
    errors.push(`language must be one of: ${VALID_LANGUAGES.join(', ')}`);
  }
  if (entity.status && !(VALID_STATUSES as readonly string[]).includes(entity.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
