/**
 * Built-in LLM pricing table — USD per 1M tokens.
 * Updated February 2026.
 */

export interface ModelPricing {
  input: number;
  output: number;
}

export const PRICING: Record<string, ModelPricing> = {
  // OpenAI
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4.5': { input: 75.00, output: 150.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  // Anthropic
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'claude-4-opus': { input: 15.00, output: 75.00 },
  'claude-4-sonnet': { input: 3.00, output: 15.00 },
  'claude-4-haiku': { input: 0.50, output: 2.50 },
};
