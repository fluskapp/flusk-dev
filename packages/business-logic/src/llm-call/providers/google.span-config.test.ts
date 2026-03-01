import { describe, it, expect } from 'vitest';
import { GOOGLE_SYSTEM_VALUES, GOOGLE_MODEL_PREFIXES } from './google.span-config.js';

describe('Google span config', () => {
  it('has system values', () => {
    expect(GOOGLE_SYSTEM_VALUES).toContain('google');
  });

  it('has model prefixes', () => {
    expect(GOOGLE_MODEL_PREFIXES.length).toBeGreaterThan(0);
  });
});
