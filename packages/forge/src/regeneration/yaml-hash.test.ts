/**
 * Tests for YAML hash — staleness detection.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { computeHash, hashYamlFile, isStale } from './yaml-hash.js';

describe('computeHash', () => {
  test('returns 64-char hex string', () => {
    const hash = computeHash('hello world');
    assert.strictEqual(hash.length, 64);
    assert.ok(/^[a-f0-9]+$/.test(hash));
  });

  test('same input produces same hash', () => {
    assert.strictEqual(computeHash('test'), computeHash('test'));
  });

  test('different input produces different hash', () => {
    assert.notStrictEqual(computeHash('a'), computeHash('b'));
  });
});

describe('hashYamlFile', () => {
  let tmpDir: string;

  test('hashes file content from disk', () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'flusk-hash-'));
    const file = join(tmpDir, 'test.yaml');
    writeFileSync(file, 'name: Test\n', 'utf-8');
    const hash = hashYamlFile(file);
    assert.strictEqual(hash, computeHash('name: Test\n'));
    rmSync(tmpDir, { recursive: true });
  });
});

describe('isStale', () => {
  test('returns false when hash matches', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'flusk-stale-'));
    const file = join(tmpDir, 'entity.yaml');
    writeFileSync(file, 'content', 'utf-8');
    const hash = computeHash('content');
    assert.strictEqual(isStale(file, hash), false);
    rmSync(tmpDir, { recursive: true });
  });

  test('returns true when hash differs', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'flusk-stale-'));
    const file = join(tmpDir, 'entity.yaml');
    writeFileSync(file, 'updated content', 'utf-8');
    assert.strictEqual(isStale(file, 'oldhash'), true);
    rmSync(tmpDir, { recursive: true });
  });
});
