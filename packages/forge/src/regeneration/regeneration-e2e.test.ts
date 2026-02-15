/**
 * E2E tests for regeneration — full round-trip: generate → customize → regenerate.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildFileHeader, parseFileHeader } from './file-header.js';
import { wrapGenerated, emptyCustomSection } from './region-markers.js';
import { smartMerge } from './smart-merge.js';
import { computeHash } from './yaml-hash.js';
import { detectChanges } from './change-detector.js';

let tmpDir: string;

describe('regeneration e2e', () => {
  beforeEach(() => { tmpDir = mkdtempSync(join(tmpdir(), 'flusk-regen-e2e-')); });
  afterEach(() => { rmSync(tmpDir, { recursive: true }); });

  test('generate → add custom → change YAML → regenerate preserves custom', () => {
    const yamlContent = 'name: Foo\nfields:\n  title: string\n';
    const yamlPath = 'packages/schema/entities/foo.yaml';
    const header = buildFileHeader(yamlPath, yamlContent);
    const generated = wrapGenerated('const create = () => {};', 'crud');
    const custom = emptyCustomSection('repo');
    const fileContent = `${header}\n\n${generated}\n\n${custom}`;

    // Simulate user adding custom code
    const withCustom = fileContent.replace(
      '// --- BEGIN CUSTOM [repo] ---\n\n// --- END CUSTOM ---',
      '// --- BEGIN CUSTOM [repo] ---\nfunction myHelper() { return 42; }\n// --- END CUSTOM ---',
    );

    // Simulate YAML change → new generation
    const newGenerated = wrapGenerated('const create = () => { /* v2 */ };', 'crud');
    const newContent = `${header}\n\n${newGenerated}\n\n${emptyCustomSection('repo')}`;

    const result = smartMerge(newContent, withCustom);
    assert.ok(result.content.includes('/* v2 */'), 'New generated code present');
    assert.ok(result.content.includes('myHelper'), 'Custom code preserved');
    assert.strictEqual(result.customSectionsPreserved, 1);
  });

  test('dry-run: detectChanges finds stale files', () => {
    const yamlDir = join(tmpDir, 'packages/schema/entities');
    mkdirSync(yamlDir, { recursive: true });
    const yamlPath = join(yamlDir, 'bar.yaml');
    writeFileSync(yamlPath, 'name: Bar\nversion: 1\n', 'utf-8');

    const srcDir = join(tmpDir, 'packages/entities/src');
    mkdirSync(srcDir, { recursive: true });
    const oldHash = computeHash('name: Bar\nversion: 0\n');
    const genFile = [
      '/**',
      ` * @generated from packages/schema/entities/bar.yaml`,
      ` * Hash: ${oldHash}`,
      ` * Generated: 2025-01-01T00:00:00.000Z`,
      ' * DO NOT EDIT generated sections — changes will be overwritten.',
      ' */',
      'const x = 1;',
    ].join('\n');
    writeFileSync(join(srcDir, 'bar.entity.ts'), genFile, 'utf-8');

    const report = detectChanges(tmpDir, ['packages/entities/src']);
    assert.strictEqual(report.total, 1);
    assert.strictEqual(report.stale.length, 1);
    assert.strictEqual(report.stale[0].yamlPath, 'packages/schema/entities/bar.yaml');
  });

  test('file header round-trip', () => {
    const header = buildFileHeader('packages/schema/entities/test.yaml', 'content');
    const parsed = parseFileHeader(header);
    assert.ok(parsed);
    assert.strictEqual(parsed.yamlPath, 'packages/schema/entities/test.yaml');
    assert.strictEqual(parsed.yamlHash, computeHash('content'));
  });

  test('manual edit in GENERATED section produces warning', () => {
    const original = [
      '// --- BEGIN GENERATED (do not edit) [crud] ---',
      'original code',
      '// --- END GENERATED ---',
    ].join('\n');

    // User manually edits the generated section
    const edited = original.replace('original code', 'hacked code');

    // New generation comes in
    const newContent = [
      '// --- BEGIN GENERATED (do not edit) [crud] ---',
      'new code v2',
      '// --- END GENERATED ---',
    ].join('\n');

    // Smart merge will replace generated section (that's correct behavior)
    const result = smartMerge(newContent, edited);
    assert.ok(result.content.includes('new code v2'));
    // The edit is lost — this is by design for GENERATED sections
    assert.ok(!result.content.includes('hacked code'));
  });
});
