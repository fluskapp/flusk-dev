/**
 * Generate deterministic SHA-256 hash for prompt deduplication
 *
 * Pure function with no side effects. Creates a unique identifier
 * combining prompt content and model to detect identical API calls.
 *
 * @param prompt - The prompt text sent to the LLM
 * @param model - The model identifier (e.g., gpt-4, claude-3-opus)
 * @returns 64-character hexadecimal SHA-256 hash
 *
 * @example
 * ```ts
 * hashPrompt("What is 2+2?", "gpt-4")
 * // => "a1b2c3d4..." (64 chars)
 * ```
 */
export declare function hashPrompt(prompt: string, model: string): string;
//# sourceMappingURL=hash-prompt.d.ts.map