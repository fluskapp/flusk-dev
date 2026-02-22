import { describe, it, expect } from 'vitest';
import { analyzeContextWindow } from './context-window-util.function.js';

describe('analyzeContextWindow', () => {
  it('calculates utilization percentage', () => {
    const result = analyzeContextWindow({ model: 'gpt-4', totalTokens: 4096 });
    expect(result.utilizationPercent).toBe(50);
    expect(result.windowSize).toBe(8192);
    expect(result.isApproachingLimit).toBe(false);
  });

  it('flags approaching limit at 80%+', () => {
    const result = analyzeContextWindow({ model: 'gpt-4', totalTokens: 7000 });
    expect(result.isApproachingLimit).toBe(true);
    expect(result.warning).toContain('Warning');
  });

  it('flags critical at 95%+', () => {
    const result = analyzeContextWindow({ model: 'gpt-4', totalTokens: 7900 });
    expect(result.warning).toContain('Critical');
  });

  it('handles unknown model', () => {
    const result = analyzeContextWindow({ model: 'unknown', totalTokens: 100 });
    expect(result.windowSize).toBeNull();
    expect(result.warning).toContain('Unknown');
  });

  it('uses custom window size', () => {
    const result = analyzeContextWindow({
      model: 'unknown',
      totalTokens: 500,
      customWindowSize: 1000,
    });
    expect(result.utilizationPercent).toBe(50);
  });
});
