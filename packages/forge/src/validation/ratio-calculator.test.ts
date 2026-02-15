/**
 * Tests for generator ratio calculation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeRatio } from './ratio-calculator.js';

describe('computeRatio', () => {
  test('counts generated vs total files correctly', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ratio-'));
    mkdirSync(join(tmp, 'packages/types/src'), { recursive: true });
    mkdirSync(join(tmp, 'packages/cli/src'), { recursive: true });

    writeFileSync(join(tmp, 'packages/types/src/a.ts'),
      '/** @generated from x.yaml */\nexport const a = 1;');
    writeFileSync(join(tmp, 'packages/types/src/b.ts'), 'export const b = 2;');
    writeFileSync(join(tmp, 'packages/cli/src/c.ts'),
      '/** @generated from y.yaml */\nexport const c = 3;');

    const result = computeRatio(tmp);
    assert.strictEqual(result.generated, 2);
    assert.strictEqual(result.total, 3);
    assert.strictEqual(result.byPackage['types'].generated, 1);
    assert.strictEqual(result.byPackage['types'].total, 2);
    assert.strictEqual(result.byPackage['cli'].generated, 1);
    rmSync(tmp, { recursive: true, force: true });
  });

  test('excludes test files from count', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'ratio-'));
    mkdirSync(join(tmp, 'packages/types/src'), { recursive: true });
    writeFileSync(join(tmp, 'packages/types/src/a.ts'), 'export const a = 1;');
    writeFileSync(join(tmp, 'packages/types/src/a.test.ts'), 'test');

    const result = computeRatio(tmp);
    assert.strictEqual(result.total, 1);
    rmSync(tmp, { recursive: true, force: true });
  });

  test('returns zeros for empty project', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'empty-'));
    const result = computeRatio(tmp);
    assert.strictEqual(result.total, 0);
    assert.strictEqual(result.generated, 0);
    rmSync(tmp, { recursive: true, force: true });
  });
});
