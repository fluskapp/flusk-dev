/**
 * Tests for tampering detection in generated files.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectTampering } from './tampering-detector.js';

describe('detectTampering', () => {
  test('returns empty for files with proper region markers', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tamper-'));
    const dir = join(tmp, 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'foo.ts'), [
      '/** @generated from packages/schema/entities/foo.yaml',
      ' * Hash: abc123',
      ' */',
      '// --- BEGIN GENERATED (do not edit) ---',
      'export const x = 1;',
      '// --- END GENERATED ---',
    ].join('\n'));

    const result = detectTampering(tmp, ['src']);
    assert.strictEqual(result.length, 0);
    rmSync(tmp, { recursive: true, force: true });
  });

  test('detects generated file missing region markers', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tamper-'));
    const dir = join(tmp, 'src');
    mkdirSync(dir, { recursive: true });
    const fakeHash = 'a'.repeat(64);
    writeFileSync(join(dir, 'bar.ts'),
      `/** @generated from packages/schema/entities/foo.yaml\n * Hash: ${fakeHash}\n */\n` + 'x'.repeat(300));

    const result = detectTampering(tmp, ['src']);
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].reason.includes('missing region markers'));
    rmSync(tmp, { recursive: true, force: true });
  });

  test('ignores non-generated files', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'tamper-'));
    const dir = join(tmp, 'src');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'manual.ts'), 'export const y = 2;');

    const result = detectTampering(tmp, ['src']);
    assert.strictEqual(result.length, 0);
    rmSync(tmp, { recursive: true, force: true });
  });
});
