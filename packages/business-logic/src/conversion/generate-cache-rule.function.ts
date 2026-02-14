/** @generated —
 * Input for generateCacheRule function
 */
export interface GenerateCacheRuleInput {
  promptHash: string;
  occurrenceCount: number;
  avgCost: number;
}

/**
 * Cache rule configuration output
 */
export interface CacheRuleConfig {
  ttl: number;
  conditions?: string[];
}

/**
 * Output from generateCacheRule function
 */
export interface GenerateCacheRuleOutput {
  config: CacheRuleConfig;
  estimatedSavings: number;
}

/**
 * Generate cache rule configuration for a pattern
 *
 * Pure function that calculates optimal TTL and conditions based on
 * pattern characteristics. Estimates monthly savings from caching.
 *
 * @param input - Pattern metadata (hash, occurrence count, avg cost)
 * @returns Cache rule config and estimated monthly savings
 *
 * @example
 * ```ts
 * generateCacheRule({
 *   promptHash: 'abc123...',
 *   occurrenceCount: 150,
 *   avgCost: 0.05
 * })
 * // => {
 * //   config: { ttl: 3600, conditions: [] },
 * //   estimatedSavings: 225.00
 * // }
 * ```
 */
export function generateCacheRule(input: GenerateCacheRuleInput): GenerateCacheRuleOutput {
  // Default TTL: 1 hour (3600 seconds)
  let ttl = 3600;

  // Adjust TTL based on occurrence frequency
  if (input.occurrenceCount > 1000) {
    // Very frequent patterns: cache for 6 hours
    ttl = 21600;
  } else if (input.occurrenceCount > 100) {
    // Frequent patterns: cache for 3 hours
    ttl = 10800;
  } else if (input.occurrenceCount < 10) {
    // Rare patterns: cache for 30 minutes
    ttl = 1800;
  }

  // Calculate estimated savings
  // Assume pattern repeats at current rate for 30 days
  // First call is not cached, all subsequent calls save cost
  const callsPerMonth = input.occurrenceCount * 30;
  const cachedCalls = Math.max(0, callsPerMonth - 30); // First call per day not cached
  const estimatedSavings = cachedCalls * input.avgCost;

  return {
    config: {
      ttl,
      conditions: []
    },
    estimatedSavings: Math.round(estimatedSavings * 100) / 100 // Round to 2 decimals
  };
}
