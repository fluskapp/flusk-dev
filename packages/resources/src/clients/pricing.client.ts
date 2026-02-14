import { llmCall } from '@flusk/business-logic';

const { calculateCost: businessCalculateCost } = llmCall;

/**
 * Pricing Client - LLM Model Cost Calculator
 * Provides pricing information for supported LLM models
 */

export interface ModelPricing {
  provider: string;
  model: string;
  inputPricePerMToken: number;  // Price per million input tokens
  outputPricePerMToken: number; // Price per million output tokens
}

/**
 * Pricing table for supported LLM models
 * Prices are per million tokens (M tokens)
 */
export const PRICING_TABLE: Record<string, ModelPricing> = {
  // OpenAI models
  'openai/gpt-4': { provider: 'openai', model: 'gpt-4', inputPricePerMToken: 30.0, outputPricePerMToken: 60.0 },
  'openai/gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo', inputPricePerMToken: 10.0, outputPricePerMToken: 30.0 },
  'openai/gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo', inputPricePerMToken: 0.5, outputPricePerMToken: 1.5 },
  'openai/gpt-4o': { provider: 'openai', model: 'gpt-4o', inputPricePerMToken: 2.5, outputPricePerMToken: 10.0 },
  'openai/gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini', inputPricePerMToken: 0.15, outputPricePerMToken: 0.6 },
  'openai/gpt-4.5': { provider: 'openai', model: 'gpt-4.5', inputPricePerMToken: 75.0, outputPricePerMToken: 150.0 },
  'openai/o3-mini': { provider: 'openai', model: 'o3-mini', inputPricePerMToken: 1.1, outputPricePerMToken: 4.4 },

  // Anthropic models
  'anthropic/claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus', inputPricePerMToken: 15.0, outputPricePerMToken: 75.0 },
  'anthropic/claude-3-sonnet': { provider: 'anthropic', model: 'claude-3-sonnet', inputPricePerMToken: 3.0, outputPricePerMToken: 15.0 },
  'anthropic/claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku', inputPricePerMToken: 0.25, outputPricePerMToken: 1.25 },
  'anthropic/claude-4-opus': { provider: 'anthropic', model: 'claude-4-opus', inputPricePerMToken: 15.0, outputPricePerMToken: 75.0 },
  'anthropic/claude-4-sonnet': { provider: 'anthropic', model: 'claude-4-sonnet', inputPricePerMToken: 3.0, outputPricePerMToken: 15.0 },
  'anthropic/claude-4-haiku': { provider: 'anthropic', model: 'claude-4-haiku', inputPricePerMToken: 0.5, outputPricePerMToken: 2.5 },

  // Google models
  'google/gemini-2.5-pro': { provider: 'google', model: 'gemini-2.5-pro', inputPricePerMToken: 1.25, outputPricePerMToken: 10.0 },
  'google/gemini-2.5-flash': { provider: 'google', model: 'gemini-2.5-flash', inputPricePerMToken: 0.15, outputPricePerMToken: 0.6 },
  'google/gemini-2.0-flash': { provider: 'google', model: 'gemini-2.0-flash', inputPricePerMToken: 0.1, outputPricePerMToken: 0.4 },

  // Cohere models
  'cohere/command': { provider: 'cohere', model: 'command', inputPricePerMToken: 1.0, outputPricePerMToken: 2.0 },
  'cohere/command-light': { provider: 'cohere', model: 'command-light', inputPricePerMToken: 0.3, outputPricePerMToken: 0.6 },
  'cohere/command-r': { provider: 'cohere', model: 'command-r', inputPricePerMToken: 0.5, outputPricePerMToken: 1.5 },
  'cohere/command-r-plus': { provider: 'cohere', model: 'command-r-plus', inputPricePerMToken: 3.0, outputPricePerMToken: 15.0 },
};

/**
 * PricingClient - Provides pricing information and cost calculations
 */
export class PricingClient {
  /**
   * Get pricing information for a specific model
   * @param provider - LLM provider (e.g., 'openai', 'anthropic')
   * @param model - Model name (e.g., 'gpt-4', 'claude-3-opus')
   * @returns ModelPricing or null if model not found
   */
  getModelPricing(provider: string, model: string): ModelPricing | null {
    const key = `${provider}/${model}`;
    return PRICING_TABLE[key] || null;
  }

  /**
   * List all available pricing information
   * @returns Array of all ModelPricing entries
   */
  listAllPricing(): ModelPricing[] {
    return Object.values(PRICING_TABLE);
  }

  /**
   * Calculate cost for a given token usage
   * Delegates to business-logic calculateCost for consistency
   * @param provider - LLM provider
   * @param model - Model name
   * @param inputTokens - Number of input tokens
   * @param outputTokens - Number of output tokens
   * @returns Cost in USD, or null if pricing not found
   */
  calculateCost(
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number | null {
    const result = businessCalculateCost({
      providerName: provider,
      modelName: model,
      tokenUsage: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      }
    });

    return result.costUsd || null;
  }
}

/**
 * Singleton pricing client instance
 */
export const pricingClient = new PricingClient();
