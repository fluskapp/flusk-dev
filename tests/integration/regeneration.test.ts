import { describe, it, expect } from 'vitest';
import { smartMerge } from '../../packages/cli/src/regeneration/smart-merge.js';
import { computeHash } from '../../packages/cli/src/regeneration/yaml-hash.js';
import {
  BEGIN_GENERATED, END_GENERATED,
  BEGIN_CUSTOM, END_CUSTOM,
} from '../../packages/cli/src/regeneration/region-markers.js';

describe('Regeneration system (no Docker)', () => {
  it('smartMerge preserves CUSTOM regions', () => {
    const existingContent = [
      BEGIN_GENERATED,
      'const oldGenerated = true;',
      END_GENERATED,
      `${BEGIN_CUSTOM.slice(0, -4)} [extra-logic] ---`,
      'function myCustomCode() { return 42; }',
      END_CUSTOM,
      BEGIN_GENERATED,
      'const moreGenerated = true;',
      END_GENERATED,
    ].join('\n');

    const newContent = [
      BEGIN_GENERATED,
      'const newGenerated = "updated";',
      END_GENERATED,
      `${BEGIN_CUSTOM.slice(0, -4)} [extra-logic] ---`,
      '// default placeholder',
      END_CUSTOM,
      BEGIN_GENERATED,
      'const moreNewGenerated = "also updated";',
      END_GENERATED,
    ].join('\n');

    const result = smartMerge(newContent, existingContent);
    expect(result.content).toContain('newGenerated');
    expect(result.content).toContain('moreNewGenerated');
    expect(result.content).toContain('myCustomCode');
    expect(result.content).not.toContain('oldGenerated');
    expect(result.customSectionsPreserved).toBe(1);
  });

  it('smartMerge with no custom sections replaces everything', () => {
    const existing = [
      BEGIN_GENERATED,
      'const old = 1;',
      END_GENERATED,
    ].join('\n');

    const fresh = [
      BEGIN_GENERATED,
      'const fresh = 2;',
      END_GENERATED,
    ].join('\n');

    const result = smartMerge(fresh, existing);
    expect(result.content).toContain('fresh');
    expect(result.content).not.toContain('const old');
    expect(result.customSectionsPreserved).toBe(0);
  });

  it('computeHash produces different hashes for different content', () => {
    const yaml1 = 'name: Foo\nfields:\n  bar:\n    type: string\n';
    const yaml2 = 'name: Foo\nfields:\n  bar:\n    type: number\n';

    const hash1 = computeHash(yaml1);
    const hash2 = computeHash(yaml2);

    expect(hash1).toBeTruthy();
    expect(hash2).toBeTruthy();
    expect(hash1).not.toBe(hash2);
  });

  it('same content produces same hash', () => {
    const yaml = 'name: Foo\nfields:\n  bar:\n    type: string\n';
    expect(computeHash(yaml)).toBe(computeHash(yaml));
  });

  it('hash is a valid SHA-256 hex string', () => {
    const hash = computeHash('test content');
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
