/**
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
export declare function generateCacheRule(input: GenerateCacheRuleInput): GenerateCacheRuleOutput;
//# sourceMappingURL=generate-cache-rule.function.d.ts.map