import { describe, it, expect } from 'vitest';
import { GOOGLE_PRICING } from './google.pricing.js';

describe('GOOGLE_PRICING', () => {
  it('has gemini model pricing', () => {
    const models = Object.keys(GOOGLE_PRICING);
    expect(models.length).toBeGreaterThan(0);
  });

  it('all models have positive prices', () => {
    for (const [model, p] of Object.entries(GOOGLE_PRICING)) {
      expect(p.input, `${model} input`).toBeGreaterThanOrEqual(0);
      expect(p.output, `${model} output`).toBeGreaterThanOrEqual(0);
    }
  });
});
