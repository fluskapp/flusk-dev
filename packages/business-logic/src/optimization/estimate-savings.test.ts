import { describe, it, expect } from 'vitest';
import { estimateSavings, estimateModelSwapSavings } from './estimate-savings.function.js';

describe('estimateSavings', () => {
  it('calculates basic savings correctly', () => {
    const result = estimateSavings({
      frequencyPerMonth: 1000,
      costPerCall: 0.03,
      expectedHitRate: 0.8,
    });
    expect(result).toBe(24); // 1000 * 0.03 * 0.8
  });

  it('clamps hit rate to 0-1', () => {
    const result = estimateSavings({
      frequencyPerMonth: 100,
      costPerCall: 0.01,
      expectedHitRate: 1.5,
    });
    expect(result).toBe(1); // clamped to 1.0
  });

  it('returns 0 for negative inputs', () => {
    expect(estimateSavings({ frequencyPerMonth: -10, costPerCall: 0.01, expectedHitRate: 0.5 })).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    const result = estimateSavings({
      frequencyPerMonth: 333,
      costPerCall: 0.007,
      expectedHitRate: 0.73,
    });
    expect(result).toBe(1.7);
  });
});

describe('estimateModelSwapSavings', () => {
  it('calculates model swap savings', () => {
    const result = estimateModelSwapSavings({
      frequencyPerMonth: 5000,
      originalCostPerCall: 0.06,
      newCostPerCall: 0.002,
    });
    expect(result).toBe(290); // 5000 * (0.06 - 0.002)
  });

  it('returns 0 if new model is more expensive', () => {
    const result = estimateModelSwapSavings({
      frequencyPerMonth: 100,
      originalCostPerCall: 0.01,
      newCostPerCall: 0.05,
    });
    expect(result).toBe(0);
  });
});
