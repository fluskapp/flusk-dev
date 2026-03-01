import { describe, it, expect } from 'vitest';
import { autoInstrument, detectInstalledSdks } from './index.js';

describe('autoInstrument', () => {
  it('returns array of patched SDK names', () => {
    const result = autoInstrument();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe('detectInstalledSdks', () => {
  it('returns array of detected SDK entries', () => {
    const result = detectInstalledSdks();
    expect(Array.isArray(result)).toBe(true);
    for (const entry of result) {
      expect(entry).toHaveProperty('name');
      expect(entry).toHaveProperty('pkg');
    }
  });
});
