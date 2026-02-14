import { TraceEntity } from '@flusk/types';

const VALID_STATUSES = ['running', 'completed', 'failed'] as const;

/**
 * Validate trace data — pure function, no I/O
 */
export function validateTrace(
  entity: Partial<TraceEntity>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!entity.organizationId) errors.push('organizationId is required');
  if (!entity.name) errors.push('name is required');
  if (!entity.status) {
    errors.push('status is required');
  } else if (!(VALID_STATUSES as readonly string[]).includes(entity.status)) {
    errors.push('status must be running, completed, or failed');
  }
  if (!entity.startedAt) errors.push('startedAt is required');

  return { valid: errors.length === 0, errors };
}
