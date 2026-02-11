/**
 * Validate PromptVersion fields
 * Pure function — no side effects, no I/O
 */

interface PartialPromptVersion {
  templateId?: string;
  content?: string;
  status?: string;
}

const VALID_STATUSES = ['draft', 'active', 'archived', 'rolled-back'];

export function validatePromptVersion(
  entity: PartialPromptVersion
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entity.templateId) {
    errors.push('templateId is required');
  }

  if (!entity.content || entity.content.trim().length === 0) {
    errors.push('content is required');
  }

  if (entity.status && !VALID_STATUSES.includes(entity.status)) {
    errors.push(`status must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  return { valid: errors.length === 0, errors };
}
