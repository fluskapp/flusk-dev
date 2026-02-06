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
export function calculateCost(provider, model, tokens) {
    const providerKey = provider.toLowerCase();
    if (!(providerKey in PRICING)) {
        return 0;
    }
    const pricing = PRICING[providerKey];
    if (!(model in pricing)) {
        return 0;
    }
    const modelPricing = pricing[model];
    const inputCost = (tokens.input / 1_000_000) * modelPricing.input;
    const outputCost = (tokens.output / 1_000_000) * modelPricing.output;
    return inputCost + outputCost;
}
//# sourceMappingURL=calculate-cost.js.map