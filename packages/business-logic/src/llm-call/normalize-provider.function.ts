/**
 * Input type for normalizeProvider function
 */
export type ProviderInput = string;

/**
 * Output type for normalizeProvider function
 */
export type ProviderOutput = 'openai' | 'anthropic' | 'azure' | 'google' | 'custom';

/**
 * Map of provider aliases to canonical provider names
 */
const PROVIDER_ALIASES: Record<string, ProviderOutput> = {
  'openai': 'openai',
  'gpt': 'openai',
  'chatgpt': 'openai',
  'anthropic': 'anthropic',
  'claude': 'anthropic',
  'azure': 'azure',
  'azure-openai': 'azure',
  'google': 'google',
  'gemini': 'google',
  'vertex': 'google',
};

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
export function normalizeProvider(input: ProviderInput): ProviderOutput {
  const normalized = input.toLowerCase().trim();
  return PROVIDER_ALIASES[normalized] ?? 'custom';
}
