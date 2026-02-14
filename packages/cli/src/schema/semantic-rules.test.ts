/**
 * Unit tests for semantic validation rules
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateSemantics } from './semantic-rules.js';
import type { EntitySchema } from './entity-schema.types.js';

function makeSchema(overrides: Partial<EntitySchema> = {}): EntitySchema {
  return { name: 'Test', fields: {}, ...overrides };
}

describe('Semantic Rules', () => {
  test('detects reserved field names', () => {
    const schema = makeSchema({
      fields: { select: { type: 'string' } },
    });
    const errors = validateSemantics(schema);
    assert.ok(errors.some((e) => e.message.includes('reserved')));
  });

  test('requires values for enum fields', () => {
    const schema = makeSchema({
      fields: { status: { type: 'enum' } },
    });
    const errors = validateSemantics(schema);
    assert.ok(errors.some((e) => e.message.includes('values')));
  });

  test('detects min > max', () => {
    const schema = makeSchema({
      fields: { score: { type: 'number', min: 10, max: 5 } },
    });
    const errors = validateSemantics(schema);
    assert.ok(errors.some((e) => e.message.includes('min')));
  });

  test('passes valid schema', () => {
    const schema = makeSchema({
      fields: {
        title: { type: 'string', required: true },
        severity: { type: 'enum', values: ['low', 'high'] },
      },
    });
    assert.strictEqual(validateSemantics(schema).length, 0);
  });
});
