import type { TokenUsage } from '@flusk/entities';
/**
 * Validate token counts against model context limits
 *
 * Pure function checking if token usage is within model's maximum
 * context window. Ensures API calls won't exceed model limits.
 *
 * @param tokens - Token usage breakdown (input, output, total)
 * @param model - Model identifier
 * @returns true if tokens are valid, false if exceeding limit or model unknown
 *
 * @example
 * ```ts
 * validateTokens({ input: 1000, output: 500, total: 1500 }, 'gpt-4')
 * // => true (1500 < 8192 limit)
 *
 * validateTokens({ input: 10000, output: 500, total: 10500 }, 'gpt-4')
 * // => false (10500 > 8192 limit)
 * ```
 */
export declare function validateTokens(tokens: TokenUsage, model: string): boolean;
//# sourceMappingURL=validate-tokens.d.ts.map