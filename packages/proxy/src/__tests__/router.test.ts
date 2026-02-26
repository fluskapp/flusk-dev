import { describe, it, expect } from 'vitest';
import { SmartRouter } from '../router.js';
import type { ProviderTarget } from '../router-config.js';

const mkTarget = (model: string, cost = 1, provider = 'openai'): ProviderTarget => ({
  provider, model, endpoint: `https://${provider}.com`,
  weight: 1, costPer1kInput: cost, costPer1kOutput: cost * 2,
});

describe('SmartRouter', () => {
  it('returns null when no targets', () => {
    const router = new SmartRouter({ targets: [] });
    expect(router.route()).toBeNull();
  });

  it('fallback picks first healthy target', () => {
    const targets = [mkTarget('gpt-4o'), mkTarget('claude-3')];
    const router = new SmartRouter({ strategy: 'fallback', targets });
    expect(router.route()?.target.model).toBe('gpt-4o');
  });

  it('fallback uses chain order', () => {
    const targets = [mkTarget('gpt-4o'), mkTarget('claude-3')];
    const router = new SmartRouter({
      strategy: 'fallback', targets, fallbackChain: ['claude-3', 'gpt-4o'],
    });
    expect(router.route()?.target.model).toBe('claude-3');
  });

  it('cost picks cheapest', () => {
    const targets = [mkTarget('gpt-4o', 10), mkTarget('mini', 0.5)];
    const router = new SmartRouter({ strategy: 'cost', targets });
    expect(router.route()?.target.model).toBe('mini');
  });

  it('round-robin cycles', () => {
    const targets = [mkTarget('a'), mkTarget('b'), mkTarget('c')];
    const router = new SmartRouter({ strategy: 'round-robin', targets });
    expect(router.route()?.target.model).toBe('a');
    expect(router.route()?.target.model).toBe('b');
    expect(router.route()?.target.model).toBe('c');
    expect(router.route()?.target.model).toBe('a');
  });

  it('skips rate-limited targets', () => {
    const targets = [mkTarget('a'), mkTarget('b')];
    const router = new SmartRouter({ strategy: 'fallback', targets });
    router.reportOutcome(targets[0]!, 100, false, 429);
    expect(router.route()?.target.model).toBe('b');
  });

  it('latency picks fastest', () => {
    const targets = [mkTarget('slow'), mkTarget('fast')];
    const router = new SmartRouter({ strategy: 'latency', targets });
    router.reportOutcome(targets[0]!, 500, true, 200);
    router.reportOutcome(targets[1]!, 50, true, 200);
    expect(router.route()?.target.model).toBe('fast');
  });
});
