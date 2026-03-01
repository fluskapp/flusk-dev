import { describe, it, expect } from 'vitest';
import { COHERE_PRICING } from './cohere.pricing.js';

describe('COHERE_PRICING', () => {
  it('has model pricing', () => {
    expect(Object.keys(COHERE_PRICING).length).toBeGreaterThan(0);
  });

  it('all prices are non-negative', () => {
    for (const [, p] of Object.entries(COHERE_PRICING)) {
      expect(p.input).toBeGreaterThanOrEqual(0);
      expect(p.output).toBeGreaterThanOrEqual(0);
    }
  });
});
