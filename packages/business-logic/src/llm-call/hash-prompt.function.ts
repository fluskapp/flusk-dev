import { createHash } from 'node:crypto';

/**
 * Input for hashPrompt function
 */
export interface HashPromptInput {
  promptText: string;
  modelName: string;
}

/**
 * Output from hashPrompt function
 */
export interface HashPromptOutput {
  promptHash: string;
}

/**
 * Generate deterministic SHA-256 hash for prompt deduplication
 *
 * Pure function with no side effects. Creates a unique identifier
 * combining prompt content and model to detect identical API calls.
 *
 * @param input - The prompt text and model name
 * @returns Object containing the 64-character hexadecimal SHA-256 hash
 *
 * @example
 * ```ts
 * hashPrompt({ promptText: "What is 2+2?", modelName: "gpt-4" })
 * // => { promptHash: "a1b2c3d4..." }
 * ```
 */
export function hashPrompt(input: HashPromptInput): HashPromptOutput {
  const combined = `${input.modelName}:${input.promptText}`;
  return {
    promptHash: createHash('sha256').update(combined, 'utf8').digest('hex'),
  };
}
