import { describe, it, expect } from 'vitest';
import {
  normalizePromptHash,
  normalizeText,
} from './normalize-prompt-hash.function.js';

describe('normalizeText', () => {
  it('normalizes whitespace and casing', () => {
    expect(normalizeText('Hello   World')).toBe('hello world');
    expect(normalizeText('  HELLO  world  ')).toBe('hello world');
  });

  it('strips ISO timestamps', () => {
    const text = 'Created at 2024-01-15T10:30:00Z by user';
    expect(normalizeText(text)).toBe('created at <TIMESTAMP> by user');
  });

  it('strips unix timestamps', () => {
    const text = 'Event at 1700000000 happened';
    expect(normalizeText(text)).toBe('event at <TIMESTAMP> happened');
  });
});

describe('normalizePromptHash', () => {
  it('produces different exact hashes for whitespace diff', () => {
    const a = normalizePromptHash({ promptText: 'hello world', modelName: 'gpt-4' });
    const b = normalizePromptHash({ promptText: 'hello  world', modelName: 'gpt-4' });
    expect(a.exactHash).not.toBe(b.exactHash);
    expect(a.normalizedHash).toBe(b.normalizedHash);
  });

  it('produces same normalized hash for case differences', () => {
    const a = normalizePromptHash({ promptText: 'Hello', modelName: 'GPT-4' });
    const b = normalizePromptHash({ promptText: 'hello', modelName: 'gpt-4' });
    expect(a.normalizedHash).toBe(b.normalizedHash);
  });
});
