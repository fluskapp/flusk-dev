import { describe, it, expect } from 'vitest';
import { ANTHROPIC_PRICING } from './anthropic.pricing.js';

describe('ANTHROPIC_PRICING', () => {
  it('has claude model pricing', () => {
    const models = Object.keys(ANTHROPIC_PRICING);
    expect(models.length).toBeGreaterThan(0);
  });

  it('all models have positive prices', () => {
    for (const [model, p] of Object.entries(ANTHROPIC_PRICING)) {
      expect(p.input, `${model} input`).toBeGreaterThan(0);
      expect(p.output, `${model} output`).toBeGreaterThan(0);
    }
  });
});
