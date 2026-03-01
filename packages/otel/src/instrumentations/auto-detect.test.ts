import { describe, it, expect } from 'vitest';
import { detectLlmSdks } from './auto-detect.js';

describe('detectLlmSdks', () => {
  it('returns array of detected SDK names', () => {
    const result = detectLlmSdks();
    expect(Array.isArray(result)).toBe(true);
    for (const name of result) {
      expect(typeof name).toBe('string');
    }
  });

  it('detects known SDK names only', () => {
    const known = ['openai', 'anthropic', 'google', 'cohere'];
    const result = detectLlmSdks();
    for (const name of result) {
      expect(known).toContain(name);
    }
  });
});
