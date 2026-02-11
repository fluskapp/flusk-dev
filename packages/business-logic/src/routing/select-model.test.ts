import { describe, it, expect } from 'vitest';
import { selectModel } from './select-model.function.js';

const PERF_DATA = [
  { model: 'gpt-4o', promptCategory: 'simple', avgQuality: 0.95, avgCostPer1kTokens: 0.01, sampleCount: 50 },
  { model: 'gpt-4o-mini', promptCategory: 'simple', avgQuality: 0.85, avgCostPer1kTokens: 0.0004, sampleCount: 50 },
  { model: 'claude-3-haiku', promptCategory: 'simple', avgQuality: 0.80, avgCostPer1kTokens: 0.0003, sampleCount: 50 },
  { model: 'gpt-4o', promptCategory: 'complex', avgQuality: 0.90, avgCostPer1kTokens: 0.01, sampleCount: 50 },
  { model: 'gpt-4o-mini', promptCategory: 'complex', avgQuality: 0.60, avgCostPer1kTokens: 0.0004, sampleCount: 50 },
];

describe('selectModel', () => {
  it('picks cheapest model meeting quality threshold', () => {
    const result = selectModel({
      complexity: 'simple',
      qualityThreshold: 0.8,
      fallbackModel: 'gpt-4o',
      modelPerformance: PERF_DATA,
    });
    expect(result.selectedModel).toBe('claude-3-haiku');
    expect(result.reason).toBe('cheapest-qualifying');
  });

  it('falls back when no model meets threshold', () => {
    const result = selectModel({
      complexity: 'complex',
      qualityThreshold: 0.95,
      fallbackModel: 'gpt-4',
      modelPerformance: PERF_DATA,
    });
    expect(result.selectedModel).toBe('gpt-4');
    expect(result.reason).toBe('fallback');
  });

  it('ignores models with insufficient samples', () => {
    const result = selectModel({
      complexity: 'simple',
      qualityThreshold: 0.8,
      fallbackModel: 'gpt-4o',
      modelPerformance: [
        { model: 'cheap', promptCategory: 'simple', avgQuality: 0.9, avgCostPer1kTokens: 0.0001, sampleCount: 2 },
      ],
    });
    expect(result.reason).toBe('fallback');
  });
});
