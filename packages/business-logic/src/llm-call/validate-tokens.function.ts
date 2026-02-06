import type { TokenUsage } from '@flusk/entities';

/**
 * Model context window limits (in tokens)
 * Updated as of January 2025
 */
const MODEL_LIMITS = {
  // OpenAI
  'gpt-4': 8192,
  'gpt-4-32k': 32768,
  'gpt-4-turbo': 128000,
  'gpt-4o': 128000,
  'gpt-4o-mini': 128000,
  'gpt-3.5-turbo': 16385,
  'gpt-3.5-turbo-16k': 16385,

  // Anthropic
  'claude-3-opus': 200000,
  'claude-3.5-sonnet': 200000,
  'claude-3-haiku': 200000,
  'claude-2.1': 200000,
  'claude-2': 100000,
  'claude-instant': 100000,

  // Cohere
  'command': 4096,
  'command-light': 4096,
  'command-r': 128000,
  'command-r-plus': 128000,
} as const;

/**
 * Input for validateTokens function
 */
export interface ValidateTokensInput {
  tokenUsage: TokenUsage;
  modelName: string;
}

/**
 * Output from validateTokens function
 */
export interface ValidateTokensOutput {
  isValid: boolean;
}

/**
 * Validate token counts against model context limits
 *
 * Pure function checking if token usage is within model's maximum
 * context window. Ensures API calls won't exceed model limits.
 *
 * @param input - Token usage and model identifier
 * @returns Object with isValid flag (true if within limit, false if exceeding or model unknown)
 *
 * @example
 * ```ts
 * validateTokens({
 *   tokenUsage: { input: 1000, output: 500, total: 1500 },
 *   modelName: 'gpt-4'
 * })
 * // => { isValid: true }
 *
 * validateTokens({
 *   tokenUsage: { input: 10000, output: 500, total: 10500 },
 *   modelName: 'gpt-4'
 * })
 * // => { isValid: false }
 * ```
 */
export function validateTokens(input: ValidateTokensInput): ValidateTokensOutput {
  const limit = MODEL_LIMITS[input.modelName as keyof typeof MODEL_LIMITS];

  if (!limit) {
    return { isValid: false };
  }

  return { isValid: input.tokenUsage.total <= limit };
}
