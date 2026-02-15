/**
 * Tests for trait composer — composition, merging, dedup.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { clearRegistry } from './trait.registry.js';
import { registerDefaultTraits, resetDefaultTraits } from './register-defaults.js';
import { composeTraits, buildContext } from './trait.composer.js';
import type { EntitySchema } from '../schema/index.js';

const testSchema: EntitySchema = {
  name: 'TestEntity',
  description: 'Test',
  storage: ['sqlite'],
  fields: {
    title: { type: 'string', required: true },
    count: { type: 'integer', min: 0 },
  },
  capabilities: { crud: true, 'time-range': true },
};

describe('TraitComposer', () => {
  beforeEach(() => {
    clearRegistry();
    resetDefaultTraits();
    registerDefaultTraits();
  });

  test('builds correct context', () => {
    const ctx = buildContext(testSchema, 'sqlite');
    assert.strictEqual(ctx.tableName, 'test_entitys');
    assert.strictEqual(ctx.camelName, 'testEntity');
    assert.strictEqual(ctx.kebabName, 'test-entity');
  });

  test('composes crud + time-range traits', () => {
    const result = composeTraits(testSchema, 'sqlite');
    assert.deepStrictEqual(result.traitNames, ['crud', 'time-range']);
    assert.ok(result.repository.includes('createTestEntity'));
    assert.ok(result.repository.includes('findTestEntitysByTimeRange'));
  });

  test('deduplicates imports in composed output', () => {
    const result = composeTraits(testSchema, 'sqlite');
    const importLines = result.repository
      .split('\n')
      .filter((l) => l.startsWith('import'));
    const unique = new Set(importLines);
    assert.strictEqual(importLines.length, unique.size);
  });

  test('includes generated header and custom section', () => {
    const result = composeTraits(testSchema, 'sqlite');
    assert.ok(result.repository.includes('@generated'));
    assert.ok(result.repository.includes('BEGIN CUSTOM'));
    assert.ok(result.repository.includes('END CUSTOM'));
  });

  test('composes with aggregation trait', () => {
    const schema = {
      ...testSchema,
      capabilities: { crud: true, aggregation: true },
    };
    const result = composeTraits(schema, 'sqlite');
    assert.ok(result.repository.includes('aggregateTestEntitys'));
    assert.ok(result.traitNames.includes('aggregation'));
  });

  test('composes with all traits', () => {
    const schema: EntitySchema = {
      ...testSchema,
      capabilities: {
        crud: true, 'time-range': true,
        aggregation: true, 'soft-delete': true, export: true,
      },
    };
    const result = composeTraits(schema, 'sqlite');
    assert.strictEqual(result.traitNames.length, 5);
    assert.ok(result.repository.includes('softDeleteTestEntity'));
    assert.ok(result.repository.includes('exportTestEntitysToCsv'));
  });

  test('generates migration SQL from time-range', () => {
    const result = composeTraits(testSchema, 'sqlite');
    assert.ok(result.migration.includes('idx_test_entitys_created_at'));
  });

  test('composes for postgres target', () => {
    const result = composeTraits(testSchema, 'postgres');
    assert.ok(result.repository.includes('$1'));
  });
});
