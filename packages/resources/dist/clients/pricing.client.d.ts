/**
 * Pricing Client - LLM Model Cost Calculator
 * Provides pricing information for supported LLM models
 */
export interface ModelPricing {
    provider: string;
    model: string;
    inputPricePerMToken: number;
    outputPricePerMToken: number;
}
/**
 * Pricing table for supported LLM models
 * Prices are per million tokens (M tokens)
 */
export declare const PRICING_TABLE: Record<string, ModelPricing>;
/**
 * PricingClient - Provides pricing information and cost calculations
 */
export declare class PricingClient {
    /**
     * Get pricing information for a specific model
     * @param provider - LLM provider (e.g., 'openai', 'anthropic')
     * @param model - Model name (e.g., 'gpt-4', 'claude-3-opus')
     * @returns ModelPricing or null if model not found
     */
    getModelPricing(provider: string, model: string): ModelPricing | null;
    /**
     * List all available pricing information
     * @returns Array of all ModelPricing entries
     */
    listAllPricing(): ModelPricing[];
    /**
     * Calculate cost for a given token usage
     * Delegates to business-logic calculateCost for consistency
     * @param provider - LLM provider
     * @param model - Model name
     * @param inputTokens - Number of input tokens
     * @param outputTokens - Number of output tokens
     * @returns Cost in USD, or null if pricing not found
     */
    calculateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number | null;
}
/**
 * Singleton pricing client instance
 */
export declare const pricingClient: PricingClient;
//# sourceMappingURL=pricing.client.d.ts.map