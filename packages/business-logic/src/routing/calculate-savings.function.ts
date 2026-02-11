/**
 * Calculate cost savings from routing to a cheaper model
 * Pure function — no I/O
 */

export interface CalculateSavingsInput {
  originalCostPer1kTokens: number;
  routedCostPer1kTokens: number;
  totalTokens: number;
}

export interface CalculateSavingsOutput {
  costSaved: number;
  savingsPercent: number;
}

/**
 * Compare original model cost vs routed model cost
 */
export function calculateSavings(
  input: CalculateSavingsInput
): CalculateSavingsOutput {
  const originalCost =
    (input.totalTokens / 1000) * input.originalCostPer1kTokens;
  const routedCost =
    (input.totalTokens / 1000) * input.routedCostPer1kTokens;

  const costSaved = originalCost - routedCost;
  const savingsPercent =
    originalCost > 0 ? (costSaved / originalCost) * 100 : 0;

  return {
    costSaved: Math.round(costSaved * 1_000_000) / 1_000_000,
    savingsPercent: Math.round(savingsPercent * 100) / 100,
  };
}
