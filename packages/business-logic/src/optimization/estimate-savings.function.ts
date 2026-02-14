/**
 * Estimate monthly savings from an optimization
 * Pure function — no I/O
 */

export interface SavingsInput {
  /** Number of calls per month matching this pattern */
  frequencyPerMonth: number;
  /** Cost per individual call in USD */
  costPerCall: number;
  /** Expected hit rate (0-1) — how often the optimization avoids the call */
  expectedHitRate: number;
}

/**
 * Calculate estimated monthly savings in USD
 */
export function estimateSavings(input: SavingsInput): number {
  const { frequencyPerMonth, costPerCall, expectedHitRate } = input;
  if (frequencyPerMonth < 0 || costPerCall < 0) return 0;
  const clampedRate = Math.max(0, Math.min(1, expectedHitRate));
  const raw = frequencyPerMonth * costPerCall * clampedRate;
  return Math.round(raw * 100) / 100;
}

/**
 * Estimate savings for a model swap (cheaper model)
 */
export function estimateModelSwapSavings(input: {
  frequencyPerMonth: number;
  originalCostPerCall: number;
  newCostPerCall: number;
}): number {
  const { frequencyPerMonth, originalCostPerCall, newCostPerCall } = input;
  if (newCostPerCall >= originalCostPerCall) return 0;
  const diff = originalCostPerCall - newCostPerCall;
  const raw = frequencyPerMonth * diff;
  return Math.round(raw * 100) / 100;
}
