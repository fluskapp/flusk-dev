import { describe, it, expect } from 'vitest';
import { OPENAI_PRICING } from './openai.pricing.js';

describe('OPENAI_PRICING', () => {
  it('has gpt-4o pricing', () => {
    expect(OPENAI_PRICING['gpt-4o']).toBeDefined();
    expect(OPENAI_PRICING['gpt-4o'].input).toBeGreaterThan(0);
    expect(OPENAI_PRICING['gpt-4o'].output).toBeGreaterThan(0);
  });

  it('all models have input and output prices', () => {
    for (const [model, pricing] of Object.entries(OPENAI_PRICING)) {
      expect(pricing.input, `${model} input`).toBeGreaterThan(0);
      expect(pricing.output, `${model} output`).toBeGreaterThan(0);
    }
  });

  it('output price >= input price for all models', () => {
    for (const [model, pricing] of Object.entries(OPENAI_PRICING)) {
      expect(pricing.output, model).toBeGreaterThanOrEqual(pricing.input);
    }
  });
});
