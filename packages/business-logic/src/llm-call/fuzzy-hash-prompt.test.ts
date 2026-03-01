import { describe, it, expect } from 'vitest';
import { fuzzyHashPrompt, normalizePrompt } from './fuzzy-hash-prompt.function.js';

describe('normalizePrompt', () => {
  it('lowercases text', () => {
    expect(normalizePrompt('Hello World')).toBe('hello world');
  });

  it('strips numbers', () => {
    expect(normalizePrompt('item 42 costs 10')).toBe('item costs');
  });

  it('collapses whitespace', () => {
    expect(normalizePrompt('a   b\n\tc')).toBe('a b c');
  });
});

describe('fuzzyHashPrompt', () => {
  it('same prompt different numbers → same hash', () => {
    const h1 = fuzzyHashPrompt('Summarize item 1', 'gpt-4');
    const h2 = fuzzyHashPrompt('Summarize item 2', 'gpt-4');
    expect(h1).toBe(h2);
  });

  it('different models → different hash', () => {
    const h1 = fuzzyHashPrompt('hello', 'gpt-4');
    const h2 = fuzzyHashPrompt('hello', 'claude-3');
    expect(h1).not.toBe(h2);
  });

  it('returns 64-char hex', () => {
    const h = fuzzyHashPrompt('test', 'gpt-4');
    expect(h).toHaveLength(64);
    expect(h).toMatch(/^[0-9a-f]+$/);
  });
});
