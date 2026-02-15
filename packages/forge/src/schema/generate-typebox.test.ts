/**
 * Unit tests for TypeBox generator
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateTypeBoxContent } from './generate-typebox.js';
import type { EntitySchema } from './entity-schema.types.js';

describe('Generate TypeBox', () => {
  test('generates basic entity schema', () => {
    const schema: EntitySchema = {
      name: 'Product',
      fields: {
        title: { type: 'string', required: true, description: 'Product title' },
        price: { type: 'number', min: 0 },
      },
    };
    const content = generateTypeBoxContent(schema);
    assert.ok(content.includes('ProductEntitySchema'));
    assert.ok(content.includes('Type.Composite'));
    assert.ok(content.includes('BaseEntitySchema'));
    assert.ok(content.includes('title:'));
    assert.ok(content.includes('Type.Optional'));
  });

  test('generates enum field with literals', () => {
    const schema: EntitySchema = {
      name: 'Task',
      fields: {
        status: { type: 'enum', values: ['open', 'closed'], required: true },
      },
    };
    const content = generateTypeBoxContent(schema);
    assert.ok(content.includes("Type.Literal('open')"));
    assert.ok(content.includes("Type.Literal('closed')"));
  });

  test('generates uuid field with format', () => {
    const schema: EntitySchema = {
      name: 'Link',
      fields: {
        targetId: { type: 'uuid', required: true },
      },
    };
    const content = generateTypeBoxContent(schema);
    assert.ok(content.includes("format: 'uuid'"));
  });
});
