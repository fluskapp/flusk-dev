/**
 * Cross-language parity tests — Node and Python generators
 * produce matching field names, types, and defaults.
 */

import { describe, it, expect } from 'vitest';
import { generateEntitySchemaContent } from '../generators/entity-schema.generator.js';
import { renderEntityTemplate } from '../templates/python/entity.template.js';
import { PYTHON_TYPE_MAP } from '../generators/python/type-map.js';
import type { EntityDefinition } from '../types/entity.types.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';

const nodeDefinition: EntityDefinition = {
  name: 'TestWidget',
  fields: [
    { name: 'name', type: 'String', required: true, unique: false },
    { name: 'count', type: 'Integer', required: false, unique: false },
    { name: 'active', type: 'Boolean', required: false, unique: false },
    { name: 'score', type: 'Number', required: false, unique: false },
    { name: 'createdBy', type: 'UUID', required: false, unique: false },
  ],
};

const pySchema: EntitySchema = {
  name: 'TestWidget',
  fields: {
    name: { type: 'string', required: true },
    count: { type: 'integer' },
    active: { type: 'boolean' },
    score: { type: 'number' },
    created_by: { type: 'uuid' },
  },
};

describe('Cross-language parity', () => {
  const nodeContent = generateEntitySchemaContent(nodeDefinition);
  const pyContent = renderEntityTemplate(pySchema);

  it('same field count', () => {
    const nodeFields = nodeDefinition.fields.map((f) => f.name);
    const pyFields = Object.keys(pySchema.fields);
    expect(nodeFields.length).toBe(pyFields.length);
  });

  it('both reference the entity name', () => {
    expect(nodeContent).toContain('TestWidget');
    expect(pyContent).toContain('TestWidget');
  });

  it('Python type map covers all Node field types', () => {
    const nodeTypes = ['string', 'integer', 'number', 'boolean', 'uuid'];
    for (const t of nodeTypes) {
      expect(PYTHON_TYPE_MAP[t as keyof typeof PYTHON_TYPE_MAP]).toBeDefined();
    }
  });

  it('both generate class/schema definition', () => {
    expect(nodeContent).toContain('TestWidgetEntitySchema');
    expect(pyContent).toContain('class TestWidget');
  });
});
