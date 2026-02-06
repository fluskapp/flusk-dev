import type { TokenUsage } from '@flusk/entities';
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
export declare function validateTokens(input: ValidateTokensInput): ValidateTokensOutput;
//# sourceMappingURL=validate-tokens.function.d.ts.map