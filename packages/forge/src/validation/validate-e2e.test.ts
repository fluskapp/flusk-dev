/**
 * E2E: generate → tamper → validate fails → fix → validate passes.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeHash } from '../regeneration/yaml-hash.js';
import { detectChanges } from '../regeneration/change-detector.js';
import { detectTampering } from './tampering-detector.js';

describe('validate-generated e2e', () => {
  test('detects stale files after YAML change, fresh after fix', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'val-e2e-'));
    mkdirSync(join(tmp, 'packages/schema/entities'), { recursive: true });
    mkdirSync(join(tmp, 'packages/entities/src'), { recursive: true });

    const yaml = 'name: Foo\nfields:\n  bar:\n    type: string\n';
    writeFileSync(join(tmp, 'packages/schema/entities/foo.yaml'), yaml);
    const hash = computeHash(yaml);

    const generated = [
      `/** @generated from packages/schema/entities/foo.yaml`,
      ` * Hash: ${hash}`,
      ` */`,
      '// --- BEGIN GENERATED (do not edit) ---',
      'export const x = 1;',
      '// --- END GENERATED ---',
    ].join('\n');
    writeFileSync(join(tmp, 'packages/entities/src/foo.ts'), generated);

    /* Initially fresh */
    const r1 = detectChanges(tmp, ['packages/entities/src']);
    assert.strictEqual(r1.fresh.length, 1);
    assert.strictEqual(r1.stale.length, 0);

    /* Modify YAML → stale */
    const newYaml = yaml + '  baz:\n    type: number\n';
    writeFileSync(join(tmp, 'packages/schema/entities/foo.yaml'), newYaml);
    const r2 = detectChanges(tmp, ['packages/entities/src']);
    assert.strictEqual(r2.stale.length, 1);

    /* Update hash → fresh again */
    const newHash = computeHash(readFileSync(join(tmp, 'packages/schema/entities/foo.yaml'), 'utf-8'));
    writeFileSync(join(tmp, 'packages/entities/src/foo.ts'), generated.replace(hash, newHash));
    const r3 = detectChanges(tmp, ['packages/entities/src']);
    assert.strictEqual(r3.fresh.length, 1);
    assert.strictEqual(r3.stale.length, 0);

    rmSync(tmp, { recursive: true, force: true });
  });

  test('detects tampering when region markers removed', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'val-e2e-'));
    mkdirSync(join(tmp, 'packages/entities/src'), { recursive: true });
    const fakeHash = 'a'.repeat(64);
    writeFileSync(join(tmp, 'packages/entities/src/bad.ts'),
      `/** @generated from packages/schema/entities/foo.yaml\n * Hash: ${fakeHash}\n */\n` + 'x'.repeat(300));

    const result = detectTampering(tmp, ['packages/entities/src']);
    assert.strictEqual(result.length, 1);
    rmSync(tmp, { recursive: true, force: true });
  });
});
