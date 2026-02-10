import { describe, it, expect } from 'vitest';
import { normalizeProvider } from './normalize-provider.function.js';

describe('normalizeProvider', () => {
  it('normalizes openai aliases', () => {
    expect(normalizeProvider('openai')).toBe('openai');
    expect(normalizeProvider('gpt')).toBe('openai');
    expect(normalizeProvider('chatgpt')).toBe('openai');
  });

  it('normalizes anthropic aliases', () => {
    expect(normalizeProvider('anthropic')).toBe('anthropic');
    expect(normalizeProvider('claude')).toBe('anthropic');
  });

  it('normalizes google aliases', () => {
    expect(normalizeProvider('google')).toBe('google');
    expect(normalizeProvider('gemini')).toBe('google');
    expect(normalizeProvider('vertex')).toBe('google');
  });

  it('is case-insensitive', () => {
    expect(normalizeProvider('OpenAI')).toBe('openai');
    expect(normalizeProvider('CLAUDE')).toBe('anthropic');
  });

  it('trims whitespace', () => {
    expect(normalizeProvider('  openai  ')).toBe('openai');
  });

  it('returns custom for unknown', () => {
    expect(normalizeProvider('unknown')).toBe('custom');
    expect(normalizeProvider('')).toBe('custom');
  });
});
