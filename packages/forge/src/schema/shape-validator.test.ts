/**
 * Unit tests for shape validator
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { validateShape } from './shape-validator.js';

describe('Shape Validator', () => {
  test('rejects non-object input', () => {
    const errors = validateShape(null);
    assert.ok(errors.length > 0);
    assert.ok(errors[0].message.includes('must be an object'));
  });

  test('rejects missing name', () => {
    const errors = validateShape({ fields: { foo: { type: 'string' } } });
    assert.ok(errors.some((e) => e.path === 'name'));
  });

  test('rejects missing fields', () => {
    const errors = validateShape({ name: 'Test' });
    assert.ok(errors.some((e) => e.path === 'fields'));
  });

  test('rejects invalid field type', () => {
    const errors = validateShape({
      name: 'Test',
      fields: { foo: { type: 'invalid' } },
    });
    assert.ok(errors.some((e) => e.path === 'fields.foo.type'));
  });

  test('accepts valid schema', () => {
    const errors = validateShape({
      name: 'Test',
      fields: { foo: { type: 'string' } },
    });
    assert.strictEqual(errors.length, 0);
  });
});
