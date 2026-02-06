/**
 * Input type for normalizeProvider function
 */
export type ProviderInput = string;
/**
 * Output type for normalizeProvider function
 */
export type ProviderOutput = 'openai' | 'anthropic' | 'azure' | 'google' | 'custom';
/**
 * Normalize provider name to canonical form
 *
 * Pure function with no side effects. Converts various provider
 * name aliases into standardized canonical names for consistent
 * processing across the platform.
 *
 * @param input - The provider name string (case-insensitive)
 * @returns Canonical provider name or 'custom' if unrecognized
 *
 * @example
 * ```ts
 * normalizeProvider('GPT')         // => 'openai'
 * normalizeProvider('claude')      // => 'anthropic'
 * normalizeProvider('gemini')      // => 'google'
 * normalizeProvider('unknown')     // => 'custom'
 * ```
 */
export declare function normalizeProvider(input: ProviderInput): ProviderOutput;
//# sourceMappingURL=normalize-provider.function.d.ts.map