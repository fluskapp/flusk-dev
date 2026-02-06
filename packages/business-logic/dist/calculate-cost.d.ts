import type { TokenUsage } from '@flusk/entities';
/**
 * Calculate LLM API call cost in USD
 *
 * Pure function with hardcoded pricing tables. Deterministic calculation
 * based on provider, model, and token usage.
 *
 * @param provider - LLM provider name (openai, anthropic, cohere)
 * @param model - Model identifier
 * @param tokens - Token usage breakdown (input, output, total)
 * @returns Cost in USD, or 0 if provider/model not found
 *
 * @example
 * ```ts
 * calculateCost('openai', 'gpt-4', { input: 1000, output: 500, total: 1500 })
 * // => 0.06 (1000 * $30/1M + 500 * $60/1M)
 * ```
 */
export declare function calculateCost(provider: string, model: string, tokens: TokenUsage): number;
//# sourceMappingURL=calculate-cost.d.ts.map