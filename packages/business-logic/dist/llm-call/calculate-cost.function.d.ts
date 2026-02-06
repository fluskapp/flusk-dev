import type { TokenUsage } from '@flusk/entities';
/**
 * Input for calculateCost function
 */
export interface CalculateCostInput {
    providerName: string;
    modelName: string;
    tokenUsage: TokenUsage;
}
/**
 * Output from calculateCost function
 */
export interface CalculateCostOutput {
    costUsd: number;
}
/**
 * Calculate LLM API call cost in USD
 *
 * Pure function with hardcoded pricing tables. Deterministic calculation
 * based on provider, model, and token usage.
 *
 * @param input - Provider name, model identifier, and token usage
 * @returns Object containing cost in USD, or 0 if provider/model not found
 *
 * @example
 * ```ts
 * calculateCost({
 *   providerName: 'openai',
 *   modelName: 'gpt-4',
 *   tokenUsage: { input: 1000, output: 500, total: 1500 }
 * })
 * // => { costUsd: 0.06 }
 * ```
 */
export declare function calculateCost(input: CalculateCostInput): CalculateCostOutput;
//# sourceMappingURL=calculate-cost.function.d.ts.map