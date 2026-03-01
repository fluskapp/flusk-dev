import { describe, it, expect } from 'vitest';
import { hashPrompt } from './hash-prompt.function.js';

describe('hashPrompt', () => {
  it('returns consistent hash for same input', () => {
    const h1 = hashPrompt({ promptText: 'hello world', modelName: 'gpt-4o' });
    const h2 = hashPrompt({ promptText: 'hello world', modelName: 'gpt-4o' });
    expect(h1.promptHash).toBe(h2.promptHash);
  });

  it('returns different hash for different inputs', () => {
    const h1 = hashPrompt({ promptText: 'hello', modelName: 'gpt-4o' });
    const h2 = hashPrompt({ promptText: 'world', modelName: 'gpt-4o' });
    expect(h1.promptHash).not.toBe(h2.promptHash);
  });

  it('returns a 64-char hex string', () => {
    const h = hashPrompt({ promptText: 'test', modelName: 'gpt-4o' });
    expect(typeof h.promptHash).toBe('string');
    expect(h.promptHash.length).toBe(64);
  });
});
