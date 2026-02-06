import { LLMCallEntity } from '@flusk/entities';
/**
 * Create a new LLM call record
 * @param llmCall - Partial LLM call data (id, timestamps auto-generated)
 * @returns Created LLM call entity with generated id and timestamps
 */
export declare function create(llmCall: Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>): Promise<LLMCallEntity>;
//# sourceMappingURL=create.d.ts.map