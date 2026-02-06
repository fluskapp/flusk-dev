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
export function detectDuplicates(
  input: DetectDuplicatesInput
): DetectDuplicatesOutput {
  const { calls } = input;

  // Group calls by prompt hash
  const groupMap = new Map<string, LLMCallEntity[]>();

  for (const call of calls) {
    const existing = groupMap.get(call.promptHash) || [];
    existing.push(call);
    groupMap.set(call.promptHash, existing);
  }

  // Calculate statistics for each group
  const groups: DuplicateGroup[] = [];

  for (const [promptHash, groupCalls] of groupMap.entries()) {
    // Only include patterns with 2+ occurrences
    if (groupCalls.length < 2) {
      continue;
    }

    // Sort by creation time
    const sorted = [...groupCalls].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const totalCost = groupCalls.reduce((sum, call) => sum + call.cost, 0);
    const avgCost = totalCost / groupCalls.length;

    // Collect up to 5 sample prompts
    const samplePrompts = sorted
      .slice(0, 5)
      .map(call => call.prompt);

    groups.push({
      promptHash,
      occurrenceCount: groupCalls.length,
      firstSeenAt: sorted[0].createdAt,
      lastSeenAt: sorted[sorted.length - 1].createdAt,
      samplePrompts,
      totalCost,
      avgCost,
      calls: sorted
    });
  }

  // Sort groups by total cost (highest first)
  groups.sort((a, b) => b.totalCost - a.totalCost);

  return { groups };
}
