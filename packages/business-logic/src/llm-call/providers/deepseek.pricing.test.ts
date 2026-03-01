import { describe, it, expect } from 'vitest';
import { DEEPSEEK_PRICING } from './deepseek.pricing.js';

describe('DEEPSEEK_PRICING', () => {
  it('has model pricing', () => {
    expect(Object.keys(DEEPSEEK_PRICING).length).toBeGreaterThan(0);
  });

  it('all prices are non-negative', () => {
    for (const [, p] of Object.entries(DEEPSEEK_PRICING)) {
      expect(p.input).toBeGreaterThanOrEqual(0);
      expect(p.output).toBeGreaterThanOrEqual(0);
    }
  });
});
