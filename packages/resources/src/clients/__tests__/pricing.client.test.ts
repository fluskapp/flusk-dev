import { describe, it, expect } from 'vitest';
import { PricingClient, PRICING_TABLE } from '../pricing.client.js';

const client = new PricingClient();

describe('PricingClient.getModelPricing', () => {
  it('returns pricing for known model', () => {
    const p = client.getModelPricing('openai', 'gpt-4');
    expect(p).not.toBeNull();
    expect(p!.provider).toBe('openai');
    expect(p!.inputPricePerMToken).toBe(30.0);
  });

  it('returns null for unknown model', () => {
    expect(client.getModelPricing('openai', 'nonexistent')).toBeNull();
  });

  it('returns null for unknown provider', () => {
    expect(client.getModelPricing('unknown', 'gpt-4')).toBeNull();
  });
});

describe('PricingClient.listAllPricing', () => {
  it('returns all models from pricing table', () => {
    const all = client.listAllPricing();
    expect(all.length).toBe(Object.keys(PRICING_TABLE).length);
    expect(all.length).toBeGreaterThan(10);
  });
});

describe('PricingClient.calculateCost', () => {
  it('calculates cost correctly for gpt-4', () => {
    // 1000 input tokens at $30/M = $0.03
    // 500 output tokens at $60/M = $0.03
    const cost = client.calculateCost('openai', 'gpt-4', 1000, 500);
    expect(cost).toBeCloseTo(0.06, 6);
  });

  it('returns 0 for 0 tokens', () => {
    expect(client.calculateCost('openai', 'gpt-4', 0, 0)).toBe(0);
  });

  it('returns null for unknown model', () => {
    expect(client.calculateCost('x', 'y', 100, 100)).toBeNull();
  });

  it('handles large token counts', () => {
    const cost = client.calculateCost('openai', 'gpt-4', 1_000_000, 1_000_000);
    expect(cost).toBeCloseTo(90.0, 2);
  });

  it('calculates anthropic claude-4-haiku correctly', () => {
    // 10000 input @ $0.5/M = $0.005, 5000 output @ $2.5/M = $0.0125
    const cost = client.calculateCost('anthropic', 'claude-4-haiku', 10000, 5000);
    expect(cost).toBeCloseTo(0.0175, 6);
  });
});
