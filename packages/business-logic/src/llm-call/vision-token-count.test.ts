import { describe, it, expect } from 'vitest';
import { estimateVisionTokens } from './vision-token-count.function.js';

describe('estimateVisionTokens', () => {
  it('returns 85 tokens for low detail', () => {
    const result = estimateVisionTokens({ width: 1024, height: 768, detail: 'low' });
    expect(result.tokens).toBe(85);
    expect(result.tiles).toBe(0);
  });

  it('calculates tiles for high detail', () => {
    const result = estimateVisionTokens({ width: 1024, height: 768, detail: 'high' });
    expect(result.tiles).toBe(4);
    expect(result.tokens).toBe(765);
  });

  it('scales large images down', () => {
    const result = estimateVisionTokens({ width: 4096, height: 4096, detail: 'high' });
    expect(result.tiles).toBe(4);
    expect(result.tokens).toBe(765);
  });

  it('uses low for small images in auto mode', () => {
    const result = estimateVisionTokens({ width: 256, height: 256, detail: 'auto' });
    expect(result.detail).toBe('low');
    expect(result.tokens).toBe(85);
  });

  it('uses high for large images in auto mode', () => {
    const result = estimateVisionTokens({ width: 1024, height: 768, detail: 'auto' });
    expect(result.detail).toBe('high');
    expect(result.tokens).toBeGreaterThan(85);
  });
});
