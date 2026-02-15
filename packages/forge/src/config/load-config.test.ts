import { describe, it, expect } from 'vitest';
import { mergeConfig } from './load-config.js';
import { DEFAULT_CONFIG } from './defaults.js';

describe('mergeConfig', () => {
  it('merges budget overrides', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { budget: { daily: 10 } });
    expect(result.budget?.daily).toBe(10);
    expect(result.alerts?.onBudgetExceeded).toBe('warn');
  });

  it('merges agent override', () => {
    const result = mergeConfig(DEFAULT_CONFIG, { agent: 'my-agent' });
    expect(result.agent).toBe('my-agent');
  });

  it('preserves defaults when no overrides', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {});
    expect(result.profiling?.duration).toBe(60);
    expect(result.storage?.mode).toBe('sqlite');
  });

  it('overrides nested alerts', () => {
    const result = mergeConfig(DEFAULT_CONFIG, {
      alerts: { onBudgetExceeded: 'block', webhook: 'https://x.com' },
    });
    expect(result.alerts?.onBudgetExceeded).toBe('block');
    expect(result.alerts?.webhook).toBe('https://x.com');
  });
});
