import { LLMCallEntity } from '@flusk/entities';
/**
 * Find LLM call by prompt hash (for cache lookups)
 * @param hash - SHA-256 hash of the prompt
 * @returns Most recent LLM call with this hash or null if not found
 */
export declare function findByPromptHash(hash: string): Promise<LLMCallEntity | null>;
//# sourceMappingURL=find-by-prompt-hash.d.ts.map