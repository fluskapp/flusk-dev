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
export declare function calculateSavings(input: CalculateSavingsInput): CalculateSavingsOutput;
//# sourceMappingURL=calculate-savings.function.d.ts.map