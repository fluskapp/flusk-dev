import { describe, it, expect } from 'vitest';
import { checkDuplicates } from './check-duplicates.function.js';

describe('checkDuplicates', () => {
  it('returns null when under threshold', () => {
    expect(checkDuplicates(0.2, 100, 10)).toBeNull();
  });

  it('returns null when no threshold set', () => {
    expect(checkDuplicates(undefined, 100, 50)).toBeNull();
  });

  it('returns null when zero calls', () => {
    expect(checkDuplicates(0.1, 0, 0)).toBeNull();
  });

  it('returns alert when ratio exceeds threshold', () => {
    const result = checkDuplicates(0.1, 100, 25);
    expect(result).not.toBeNull();
    expect(result!.ratio).toBe(0.25);
    expect(result!.message).toContain('25% duplicate ratio');
    expect(result!.message).toContain('10% threshold');
  });
});
