/**
 * Snapshot tests for Python generators.
 */

import { describe, it, expect } from 'vitest';
import { renderEntityTemplate } from '../templates/python/entity.template.js';
import { renderTypesTemplate } from '../templates/python/types.template.js';
import { renderRepositoryTemplate } from '../templates/python/repository.template.js';
import { renderTestTemplate } from '../templates/python/test.template.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';

const schema: EntitySchema = {
  name: 'TestWidget',
  description: 'A test entity for snapshot testing',
  storage: ['sqlite'],
  fields: {
    name: { type: 'string', required: true, description: 'Widget name' },
    count: { type: 'integer', default: 0 },
    active: { type: 'boolean', default: true },
    metadata: { type: 'json', default: '{}' },
    score: { type: 'number' },
    created_by: { type: 'uuid' },
  },
};

describe('Python generator snapshots', () => {
  it('entity template', () => {
    expect(renderEntityTemplate(schema)).toMatchSnapshot();
  });

  it('types template', () => {
    expect(renderTypesTemplate(schema)).toMatchSnapshot();
  });

  it('repository template', () => {
    expect(renderRepositoryTemplate(schema)).toMatchSnapshot();
  });

  it('test template', () => {
    expect(renderTestTemplate(schema)).toMatchSnapshot();
  });
});
