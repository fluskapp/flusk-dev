import { LLMCallEntity } from '@flusk/entities';
/**
 * Output type for duplicate detection
 */
export interface DuplicateGroup {
    promptHash: string;
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    samplePrompts: string[];
    totalCost: number;
    avgCost: number;
    calls: LLMCallEntity[];
}
/**
 * Input type for duplicate detection
 */
export interface DetectDuplicatesInput {
    calls: LLMCallEntity[];
}
/**
 * Output type for duplicate detection
 */
export interface DetectDuplicatesOutput {
    groups: DuplicateGroup[];
}
/**
 * Detect duplicate prompts in a collection of LLM calls
 * Groups calls by promptHash and calculates statistics for each group
 *
 * Pure function - no side effects, no I/O
 *
 * @param input - Object containing array of LLM call entities to analyze
 * @returns Object containing array of duplicate groups with statistics
 */
export declare function detectDuplicates(input: DetectDuplicatesInput): DetectDuplicatesOutput;
//# sourceMappingURL=detect-duplicates.function.d.ts.map