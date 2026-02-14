/** @generated —
 * Check if a single LLM call exceeds the per-call cost threshold
 */
import type { PerCallAlert } from './budget.types.js';

export function checkPerCall(
  threshold: number | undefined,
  model: string,
  cost: number,
): PerCallAlert | null {
  if (threshold == null || cost <= threshold) return null;

  return {
    model,
    cost,
    threshold,
    message: `Call to ${model} cost $${cost.toFixed(4)} — exceeds $${threshold.toFixed(4)} threshold`,
  };
}
