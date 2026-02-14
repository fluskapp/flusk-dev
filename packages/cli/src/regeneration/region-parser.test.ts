/**
 * Tests for region parser — extraction and detection.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseRegions, extractCustomSections, hasManualEdits } from './region-parser.js';

describe('parseRegions', () => {
  test('parses static-only content', () => {
    const regions = parseRegions('const x = 1;\nconst y = 2;');
    assert.strictEqual(regions.length, 1);
    assert.strictEqual(regions[0].kind, 'static');
  });

  test('parses generated + custom regions', () => {
    const input = [
      '// header',
      '// --- BEGIN GENERATED (do not edit) ---',
      'const a = 1;',
      '// --- END GENERATED ---',
      '// --- BEGIN CUSTOM ---',
      'const b = 2;',
      '// --- END CUSTOM ---',
    ].join('\n');
    const regions = parseRegions(input);
    assert.strictEqual(regions.length, 3);
    assert.strictEqual(regions[0].kind, 'static');
    assert.strictEqual(regions[1].kind, 'generated');
    assert.strictEqual(regions[1].content, 'const a = 1;');
    assert.strictEqual(regions[2].kind, 'custom');
    assert.strictEqual(regions[2].content, 'const b = 2;');
  });

  test('parses labeled regions', () => {
    const input = [
      '// --- BEGIN CUSTOM [repo] ---',
      'custom code',
      '// --- END CUSTOM ---',
    ].join('\n');
    const regions = parseRegions(input);
    assert.strictEqual(regions[0].label, 'repo');
  });
});

describe('extractCustomSections', () => {
  test('returns map of label to content', () => {
    const input = [
      '// --- BEGIN CUSTOM [business] ---',
      'function foo() {}',
      '// --- END CUSTOM ---',
      '// --- BEGIN CUSTOM ---',
      'function bar() {}',
      '// --- END CUSTOM ---',
    ].join('\n');
    const map = extractCustomSections(input);
    assert.strictEqual(map.get('business'), 'function foo() {}');
    assert.ok(map.has('custom-1'));
  });
});

describe('hasManualEdits', () => {
  test('detects edits in generated sections', () => {
    const content = [
      '// --- BEGIN GENERATED (do not edit) [crud] ---',
      'MODIFIED',
      '// --- END GENERATED ---',
    ].join('\n');
    const expected = new Map([['crud', 'original code']]);
    const warnings = hasManualEdits(content, expected);
    assert.strictEqual(warnings.length, 1);
    assert.ok(warnings[0].includes('crud'));
  });

  test('no warnings when content matches', () => {
    const content = [
      '// --- BEGIN GENERATED (do not edit) [crud] ---',
      'original code',
      '// --- END GENERATED ---',
    ].join('\n');
    const expected = new Map([['crud', 'original code']]);
    assert.strictEqual(hasManualEdits(content, expected).length, 0);
  });
});
