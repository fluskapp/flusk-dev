/**
 * Validate PromptTemplate fields
 * Pure function — no side effects, no I/O
 */

interface PartialPromptTemplate {
  name?: string;
  organizationId?: string;
  variables?: string[];
}

export function validatePromptTemplate(
  entity: PartialPromptTemplate
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entity.name || entity.name.trim().length === 0) {
    errors.push('name is required');
  }

  if (!entity.organizationId) {
    errors.push('organizationId is required');
  }

  if (entity.variables && !Array.isArray(entity.variables)) {
    errors.push('variables must be an array');
  }

  return { valid: errors.length === 0, errors };
}
