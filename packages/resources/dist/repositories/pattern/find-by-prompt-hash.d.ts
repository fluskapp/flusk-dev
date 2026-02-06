import { PatternEntity } from '@flusk/entities';
/**
 * Find pattern by organization and prompt hash
 * Used for checking if pattern already exists before creating
 * @param organizationId - UUID of the organization
 * @param promptHash - SHA-256 hash of the prompt
 * @returns Pattern entity or null if not found
 */
export declare function findByPromptHash(organizationId: string, promptHash: string): Promise<PatternEntity | null>;
//# sourceMappingURL=find-by-prompt-hash.d.ts.map