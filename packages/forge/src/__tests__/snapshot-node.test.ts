/**
 * Snapshot tests for Node.js generators.
 */

import { describe, it, expect } from 'vitest';
import { generateEntitySchemaContent } from '../generators/entity-schema.generator.js';
import { generateRoutesTemplate } from '../templates/routes.template.js';
import { generatePluginTemplate } from '../templates/plugin.template.js';
import { generateHooksTemplate } from '../templates/hooks.template.js';
import { generateRepositoryTemplate } from '../templates/repository.template.js';
import type { EntityDefinition } from '../types/entity.types.js';

const definition: EntityDefinition = {
  name: 'TestWidget',
  fields: [
    { name: 'name', type: 'String', required: true, unique: false, description: 'Widget name' },
    { name: 'count', type: 'Integer', required: false, unique: false },
    { name: 'active', type: 'Boolean', required: false, unique: false },
    { name: 'score', type: 'Number', required: false, unique: false },
    { name: 'createdBy', type: 'UUID', required: false, unique: false },
  ],
};

const entityName = 'test-widget';

describe('Node generator snapshots', () => {
  it('entity-schema', () => {
    expect(generateEntitySchemaContent(definition)).toMatchSnapshot();
  });

  it('routes template', () => {
    expect(generateRoutesTemplate(entityName)).toMatchSnapshot();
  });

  it('plugin template', () => {
    expect(generatePluginTemplate(entityName)).toMatchSnapshot();
  });

  it('hooks template', () => {
    expect(generateHooksTemplate(entityName)).toMatchSnapshot();
  });

  it('repository template', () => {
    expect(generateRepositoryTemplate(entityName)).toMatchSnapshot();
  });
});
