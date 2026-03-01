import { describe, it, expect } from 'vitest';
import { PRICING } from '../pricing.js';

describe('PRICING', () => {
  it('has openai models', () => {
    expect(PRICING['gpt-4o']).toBeDefined();
    expect(PRICING['gpt-4o-mini']).toBeDefined();
  });

  it('has anthropic models', () => {
    expect(PRICING['claude-3-opus']).toBeDefined();
    expect(PRICING['claude-3-sonnet']).toBeDefined();
  });

  it('all prices are positive', () => {
    for (const [model, p] of Object.entries(PRICING)) {
      expect(p.input, `${model} input`).toBeGreaterThan(0);
      expect(p.output, `${model} output`).toBeGreaterThan(0);
    }
  });
});
