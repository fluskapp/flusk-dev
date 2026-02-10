/**
 * Structure Validator Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { validateStructure } from './structure.validator.js';

const TEST_DIR = resolve(process.cwd(), 'test-temp-structure');

describe('Structure Validator', () => {
  beforeEach(() => {
    // Create test directory
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should validate complete project structure', async () => {
    // Create all required directories
    const requiredDirs = [
      'packages/entities/src',
      'packages/types/src',
      'packages/resources/src',
      'packages/business-logic/src',
      'packages/execution/src',
    ];

    for (const dir of requiredDirs) {
      mkdirSync(resolve(TEST_DIR, dir), { recursive: true });
      writeFileSync(resolve(TEST_DIR, dir.replace('/src', '/package.json')), '{}');
    }

    // Create required files
    writeFileSync(resolve(TEST_DIR, 'package.json'), '{}');
    writeFileSync(resolve(TEST_DIR, 'pnpm-workspace.yaml'), '');
    writeFileSync(resolve(TEST_DIR, 'tsconfig.json'), '{}');

    const result = await validateStructure(TEST_DIR);

    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errors.length, 0);
  });

  it('should detect missing required directories', async () => {
    // Create only package.json
    writeFileSync(resolve(TEST_DIR, 'package.json'), '{}');

    const result = await validateStructure(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('Required directory not found')));
  });

  it('should detect missing required files', async () => {
    // Create directories but not files
    const requiredDirs = [
      'packages/entities/src',
      'packages/types/src',
      'packages/resources/src',
      'packages/business-logic/src',
      'packages/execution/src',
    ];

    for (const dir of requiredDirs) {
      mkdirSync(resolve(TEST_DIR, dir), { recursive: true });
    }

    const result = await validateStructure(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.file === 'package.json'));
    assert.ok(result.errors.some(e => e.file === 'pnpm-workspace.yaml'));
    assert.ok(result.errors.some(e => e.file === 'tsconfig.json'));
  });

  it('should warn about missing recommended files', async () => {
    // Create all required structures
    const requiredDirs = [
      'packages/entities/src',
      'packages/types/src',
      'packages/resources/src',
      'packages/business-logic/src',
      'packages/execution/src',
    ];

    for (const dir of requiredDirs) {
      mkdirSync(resolve(TEST_DIR, dir), { recursive: true });
      writeFileSync(resolve(TEST_DIR, dir.replace('/src', '/package.json')), '{}');
    }

    writeFileSync(resolve(TEST_DIR, 'package.json'), '{}');
    writeFileSync(resolve(TEST_DIR, 'pnpm-workspace.yaml'), '');
    writeFileSync(resolve(TEST_DIR, 'tsconfig.json'), '{}');

    const result = await validateStructure(TEST_DIR);

    assert.strictEqual(result.valid, true);
    assert.ok(result.warnings.some(w => w.file === '.gitignore'));
    assert.ok(result.warnings.some(w => w.file === 'docker-compose.yml'));
  });

  it('should detect missing package.json in packages', async () => {
    // Create directory without package.json
    mkdirSync(resolve(TEST_DIR, 'packages/entities/src'), { recursive: true });

    const result = await validateStructure(TEST_DIR);

    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some(e => e.message.includes('missing package.json')));
  });

  it('should warn about .env file in root', async () => {
    // Create all required structures
    const requiredDirs = [
      'packages/entities/src',
      'packages/types/src',
      'packages/resources/src',
      'packages/business-logic/src',
      'packages/execution/src',
    ];

    for (const dir of requiredDirs) {
      mkdirSync(resolve(TEST_DIR, dir), { recursive: true });
      writeFileSync(resolve(TEST_DIR, dir.replace('/src', '/package.json')), '{}');
    }

    writeFileSync(resolve(TEST_DIR, 'package.json'), '{}');
    writeFileSync(resolve(TEST_DIR, 'pnpm-workspace.yaml'), '');
    writeFileSync(resolve(TEST_DIR, 'tsconfig.json'), '{}');
    writeFileSync(resolve(TEST_DIR, '.env'), 'SECRET=xxx');

    const result = await validateStructure(TEST_DIR);

    assert.ok(result.warnings.some(w => w.file === '.env'));
    assert.ok(result.warnings.some(w => w.message.includes('should not be committed')));
  });
});
