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
};
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
export function validateTokens(tokens, model) {
    const limit = MODEL_LIMITS[model];
    if (!limit) {
        return false;
    }
    return tokens.total <= limit;
}
//# sourceMappingURL=validate-tokens.js.map