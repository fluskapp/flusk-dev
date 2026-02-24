import { describe, it, expect } from 'vitest';
import { calculateCost } from '../cost-calculator.js';

describe('calculateCost', () => {
  it('calculates cost for gpt-4o', () => {
    const result = calculateCost('gpt-4o', { input: 1000, output: 500, total: 1500 });
    expect(result.costUsd).toBeCloseTo(0.0025 + 0.005);
  });

  it('calculates cost for claude-3.5-sonnet', () => {
    const result = calculateCost('claude-3.5-sonnet', { input: 1_000_000, output: 1_000_000, total: 2_000_000 });
    expect(result.costUsd).toBeCloseTo(3.0 + 15.0);
  });

  it('strips date suffix from model name', () => {
    const result = calculateCost('gpt-4o-20240806', { input: 1000, output: 0, total: 1000 });
    expect(result.costUsd).toBeCloseTo(0.0025);
  });

  it('returns null for unknown model', () => {
    const result = calculateCost('some-unknown-model', { input: 100, output: 100, total: 200 });
    expect(result.costUsd).toBeNull();
  });

  it('handles zero tokens', () => {
    const result = calculateCost('gpt-4o', { input: 0, output: 0, total: 0 });
    expect(result.costUsd).toBe(0);
  });
});
