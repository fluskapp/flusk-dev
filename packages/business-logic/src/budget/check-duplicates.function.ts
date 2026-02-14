/**
 * Check if duplicate call ratio exceeds configured threshold
 */
import type { DuplicateAlert } from './budget.types.js';

export function checkDuplicates(
  threshold: number | undefined,
  totalCalls: number,
  duplicateCalls: number,
): DuplicateAlert | null {
  if (threshold == null || totalCalls === 0) return null;

  const ratio = duplicateCalls / totalCalls;
  if (ratio <= threshold) return null;

  return {
    ratio,
    threshold,
    message: `${(ratio * 100).toFixed(0)}% duplicate ratio exceeds ${(threshold * 100).toFixed(0)}% threshold`,
  };
}
