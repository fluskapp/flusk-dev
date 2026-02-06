/**
 * Pricing table for LLM providers (USD per 1M tokens)
 * Updated as of January 2025
 */
const PRICING = {
    openai: {
        'gpt-4': { input: 30.0, output: 60.0 },
        'gpt-4-turbo': { input: 10.0, output: 30.0 },
        'gpt-4o': { input: 5.0, output: 15.0 },
        'gpt-4o-mini': { input: 0.15, output: 0.6 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    },
    anthropic: {
        'claude-3-opus': { input: 15.0, output: 75.0 },
        'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
        'claude-3-haiku': { input: 0.25, output: 1.25 },
    },
    cohere: {
        'command': { input: 1.0, output: 2.0 },
        'command-light': { input: 0.3, output: 0.6 },
    },
};
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
export function calculateCost(input) {
    const providerKey = input.providerName.toLowerCase();
    if (!(providerKey in PRICING)) {
        return { costUsd: 0 };
    }
    const pricing = PRICING[providerKey];
    if (!(input.modelName in pricing)) {
        return { costUsd: 0 };
    }
    const modelPricing = pricing[input.modelName];
    const inputCost = (input.tokenUsage.input / 1_000_000) * modelPricing.input;
    const outputCost = (input.tokenUsage.output / 1_000_000) * modelPricing.output;
    return { costUsd: inputCost + outputCost };
}
//# sourceMappingURL=calculate-cost.function.js.map