import { PatternEntity } from '@flusk/entities';

/**
 * Savings calculation result
 */
export interface SavingsEstimate {
  potentialSavings: number;
  savingsPercentage: number;
  recommendedAction: string;
  roi: number;
}

/**
 * Input type for savings calculation
 */
export interface CalculateSavingsInput {
  pattern: PatternEntity;
  cacheCostPerCall?: number;
}

/**
 * Output type for savings calculation
 */
export interface CalculateSavingsOutput {
  estimate: SavingsEstimate;
}

/**
 * Calculate potential savings if a pattern is converted to caching/automation
 *
 * Pure function - no side effects, no I/O
 *
 * @param input - Object containing pattern entity and optional cache cost
 * @returns Object containing savings estimate with recommendations
 */
export function calculateSavings(
  input: CalculateSavingsInput
): CalculateSavingsOutput {
  const { pattern, cacheCostPerCall = 0.0001 } = input;

  // Calculate cost with caching
  // First call is full cost, subsequent calls use cache cost
  const cachedCost = pattern.avgCost + (pattern.occurrenceCount - 1) * cacheCostPerCall;

  // Calculate potential savings
  const potentialSavings = pattern.totalCost - cachedCost;
  const savingsPercentage = (potentialSavings / pattern.totalCost) * 100;

  // Determine recommended action based on cost and frequency
  let recommendedAction: string;

  if (pattern.occurrenceCount >= 100 && pattern.totalCost >= 10) {
    recommendedAction = 'HIGH_PRIORITY_CACHE';
  } else if (pattern.occurrenceCount >= 50 && pattern.totalCost >= 5) {
    recommendedAction = 'MEDIUM_PRIORITY_CACHE';
  } else if (pattern.occurrenceCount >= 20 && pattern.totalCost >= 1) {
    recommendedAction = 'LOW_PRIORITY_CACHE';
  } else if (pattern.occurrenceCount >= 10) {
    recommendedAction = 'CONSIDER_CACHE';
  } else {
    recommendedAction = 'MONITOR';
  }

  // Calculate ROI (return on investment)
  // Assume implementation cost is fixed (e.g., 1 hour of developer time at $100/hour)
  const implementationCost = 100;
  const roi = implementationCost > 0 ? (potentialSavings / implementationCost) : 0;

  const estimate: SavingsEstimate = {
    potentialSavings,
    savingsPercentage,
    recommendedAction,
    roi
  };

  return { estimate };
}
