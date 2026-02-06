import { PatternEntity } from '@flusk/entities';
/**
 * Update pattern occurrence when a duplicate call is detected
 * Increments count, updates timestamps, recalculates averages, adds sample if needed
 * @param id - UUID of the pattern to update
 * @param newCost - Cost of the new occurrence
 * @param newPrompt - Optional new sample prompt to add
 * @returns Updated pattern entity or null if not found
 */
export declare function updateOccurrence(id: string, newCost: number, newPrompt?: string): Promise<PatternEntity | null>;
//# sourceMappingURL=update-occurrence.d.ts.map