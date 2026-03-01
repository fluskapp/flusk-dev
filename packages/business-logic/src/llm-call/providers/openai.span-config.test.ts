import { describe, it, expect } from 'vitest';
import { OPENAI_SYSTEM_VALUES, OPENAI_MODEL_PREFIXES } from './openai.span-config.js';

describe('OpenAI span config', () => {
  it('has system values', () => {
    expect(OPENAI_SYSTEM_VALUES).toContain('openai');
  });

  it('has model prefixes', () => {
    expect(OPENAI_MODEL_PREFIXES.length).toBeGreaterThan(0);
    expect(OPENAI_MODEL_PREFIXES).toContain('gpt-');
  });
});
