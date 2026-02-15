/**
 * Tests for smart merge — custom section preservation.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { smartMerge } from './smart-merge.js';

describe('smartMerge', () => {
  test('preserves custom code when generated sections change', () => {
    const existing = [
      '// --- BEGIN GENERATED (do not edit) ---',
      'old generated code',
      '// --- END GENERATED ---',
      '// --- BEGIN CUSTOM ---',
      'my custom function() {}',
      '// --- END CUSTOM ---',
    ].join('\n');

    const newContent = [
      '// --- BEGIN GENERATED (do not edit) ---',
      'new generated code',
      '// --- END GENERATED ---',
      '// --- BEGIN CUSTOM ---',
      '',
      '// --- END CUSTOM ---',
    ].join('\n');

    const result = smartMerge(newContent, existing);
    assert.ok(result.content.includes('new generated code'));
    assert.ok(result.content.includes('my custom function() {}'));
    assert.strictEqual(result.customSectionsPreserved, 1);
  });

  test('preserves labeled custom sections', () => {
    const existing = [
      '// --- BEGIN CUSTOM [business] ---',
      'function calculate() { return 42; }',
      '// --- END CUSTOM ---',
    ].join('\n');

    const newContent = [
      '// --- BEGIN GENERATED (do not edit) ---',
      'updated',
      '// --- END GENERATED ---',
      '// --- BEGIN CUSTOM [business] ---',
      '',
      '// --- END CUSTOM ---',
    ].join('\n');

    const result = smartMerge(newContent, existing);
    assert.ok(result.content.includes('calculate'));
    assert.strictEqual(result.customSectionsPreserved, 1);
  });

  test('warns about orphaned custom sections', () => {
    const existing = [
      '// --- BEGIN CUSTOM [removed-trait] ---',
      'orphaned code',
      '// --- END CUSTOM ---',
    ].join('\n');

    const newContent = [
      '// --- BEGIN GENERATED (do not edit) ---',
      'only generated',
      '// --- END GENERATED ---',
    ].join('\n');

    const result = smartMerge(newContent, existing);
    assert.strictEqual(result.warnings.length, 1);
    assert.ok(result.warnings[0].includes('removed-trait'));
  });

  test('handles empty custom sections gracefully', () => {
    const existing = [
      '// --- BEGIN CUSTOM ---',
      '',
      '// --- END CUSTOM ---',
    ].join('\n');

    const newContent = [
      '// --- BEGIN CUSTOM ---',
      '',
      '// --- END CUSTOM ---',
    ].join('\n');

    const result = smartMerge(newContent, existing);
    assert.strictEqual(result.customSectionsPreserved, 0);
    assert.strictEqual(result.warnings.length, 0);
  });
});
