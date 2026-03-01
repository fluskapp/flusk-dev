import { describe, it, expect } from 'vitest';
import { BEDROCK_PRICING } from './bedrock.pricing.js';

describe('BEDROCK_PRICING', () => {
  it('has model pricing', () => {
    expect(Object.keys(BEDROCK_PRICING).length).toBeGreaterThan(0);
  });

  it('all prices are non-negative', () => {
    for (const [, p] of Object.entries(BEDROCK_PRICING)) {
      expect(p.input).toBeGreaterThanOrEqual(0);
      expect(p.output).toBeGreaterThanOrEqual(0);
    }
  });
});
