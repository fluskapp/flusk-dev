/**
 * Select the cheapest model that meets the quality threshold
 * Pure function — no I/O
 */

import type { ComplexityLevel } from './classify-complexity.function.js';

export interface ModelPerformanceData {
  model: string;
  promptCategory: string;
  avgQuality: number;
  avgCostPer1kTokens: number;
  sampleCount: number;
}

export interface SelectModelInput {
  complexity: ComplexityLevel;
  qualityThreshold: number;
  fallbackModel: string;
  modelPerformance: ModelPerformanceData[];
  minSampleCount?: number;
}

export interface SelectModelOutput {
  selectedModel: string;
  reason: string;
  expectedQuality: number;
  expectedCostPer1kTokens: number;
}

/**
 * Pick the cheapest model that meets quality threshold for the given complexity
 */
export function selectModel(input: SelectModelInput): SelectModelOutput {
  const minSamples = input.minSampleCount ?? 5;

  const candidates = input.modelPerformance
    .filter(
      (m) =>
        m.promptCategory === input.complexity &&
        m.avgQuality >= input.qualityThreshold &&
        m.sampleCount >= minSamples
    )
    .sort((a, b) => a.avgCostPer1kTokens - b.avgCostPer1kTokens);

  if (candidates.length === 0) {
    return {
      selectedModel: input.fallbackModel,
      reason: 'fallback',
      expectedQuality: 0,
      expectedCostPer1kTokens: 0,
    };
  }

  const best = candidates[0];
  return {
    selectedModel: best.model,
    reason: 'cheapest-qualifying',
    expectedQuality: best.avgQuality,
    expectedCostPer1kTokens: best.avgCostPer1kTokens,
  };
}
