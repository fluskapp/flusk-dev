/**
 * Input for generateDowngrade function
 */
export interface GenerateDowngradeInput {
    provider: string;
    model: string;
    occurrenceCount: number;
    avgCost: number;
}
/**
 * Downgrade configuration output
 */
export interface DowngradeConfig {
    fromModel: string;
    toModel: string;
    estimatedQualityLoss: number;
}
/**
 * Output from generateDowngrade function
 */
export interface GenerateDowngradeOutput {
    config: DowngradeConfig;
    estimatedSavings: number;
}
/**
 * Generate model downgrade suggestion for a pattern
 *
 * Pure function that identifies cheaper model alternatives and estimates
 * savings and quality impact. Returns null if no downgrade is available.
 *
 * @param input - Pattern metadata (provider, model, occurrence count, avg cost)
 * @returns Downgrade config and estimated monthly savings, or null if no downgrade
 *
 * @example
 * ```ts
 * generateDowngrade({
 *   provider: 'openai',
 *   model: 'gpt-4',
 *   occurrenceCount: 100,
 *   avgCost: 0.06
 * })
 * // => {
 * //   config: {
 * //     fromModel: 'gpt-4',
 * //     toModel: 'gpt-4o-mini',
 * //     estimatedQualityLoss: 0.15
 * //   },
 * //   estimatedSavings: 171.00
 * // }
 * ```
 */
export declare function generateDowngrade(input: GenerateDowngradeInput): GenerateDowngradeOutput | null;
//# sourceMappingURL=generate-downgrade.function.d.ts.map