import { LLMCallEntity } from '@flusk/entities';
/**
 * Update LLM call record
 * @param id - UUID of the LLM call to update
 * @param data - Partial data to update
 * @returns Updated LLM call entity or null if not found
 */
export declare function update(id: string, data: Partial<Omit<LLMCallEntity, 'id' | 'createdAt' | 'updatedAt'>>): Promise<LLMCallEntity | null>;
//# sourceMappingURL=update.d.ts.map