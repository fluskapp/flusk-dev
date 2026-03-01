import { describe, it, expect } from 'vitest';
import { ANTHROPIC_SYSTEM_VALUES, ANTHROPIC_MODEL_PREFIXES } from './anthropic.span-config.js';

describe('Anthropic span config', () => {
  it('has system values', () => {
    expect(ANTHROPIC_SYSTEM_VALUES).toContain('anthropic');
  });

  it('has model prefixes', () => {
    expect(ANTHROPIC_MODEL_PREFIXES.length).toBeGreaterThan(0);
    expect(ANTHROPIC_MODEL_PREFIXES).toContain('claude-');
  });
});
