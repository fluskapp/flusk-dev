import { describe, it, expect } from 'vitest';
import { AZURE_OPENAI_PRICING } from './azure-openai.pricing.js';

describe('AZURE_OPENAI_PRICING', () => {
  it('has model pricing', () => {
    expect(Object.keys(AZURE_OPENAI_PRICING).length).toBeGreaterThan(0);
  });

  it('all prices are non-negative', () => {
    for (const [, p] of Object.entries(AZURE_OPENAI_PRICING)) {
      expect(p.input).toBeGreaterThanOrEqual(0);
      expect(p.output).toBeGreaterThanOrEqual(0);
    }
  });
});
