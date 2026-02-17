/**
 * Tests for Python code generators.
 */

import { describe, it, expect } from 'vitest';
import { renderEntityTemplate } from '../../templates/python/entity.template.js';
import { renderTypesTemplate } from '../../templates/python/types.template.js';
import { renderRepositoryTemplate } from '../../templates/python/repository.template.js';
import { renderTestTemplate } from '../../templates/python/test.template.js';
import { pythonType, buildFieldKwargs, collectImports } from './type-map.js';
import type { EntitySchema } from '../../schema/entity-schema.types.js';

const schema: EntitySchema = {
  name: 'LLMCall',
  description: 'A single LLM API call',
  storage: ['sqlite'],
  fields: {
    provider: { type: 'string', required: true, description: 'Provider name' },
    model: { type: 'string', required: true, index: true, description: 'Model ID' },
    cost: { type: 'number', required: true, min: 0, default: 0, description: 'Cost in USD' },
    cached: { type: 'boolean', required: true, default: false, description: 'Cache hit' },
    tokens: { type: 'json', required: true, default: '{}', description: 'Token usage' },
  },
};

describe('pythonType', () => {
  it('maps string to str', () => expect(pythonType('string')).toBe('str'));
  it('maps integer to int', () => expect(pythonType('integer')).toBe('int'));
  it('maps number to float', () => expect(pythonType('number')).toBe('float'));
  it('maps boolean to bool', () => expect(pythonType('boolean')).toBe('bool'));
  it('maps uuid to UUID', () => expect(pythonType('uuid')).toBe('UUID'));
  it('maps date to datetime', () => expect(pythonType('date')).toBe('datetime'));
  it('maps json to dict', () => expect(pythonType('json')).toBe('dict[str, Any]'));
});

describe('buildFieldKwargs', () => {
  it('builds Field with default and description', () => {
    const result = buildFieldKwargs({ type: 'number', default: 0, description: 'Cost', min: 0 });
    expect(result).toContain('default=0');
    expect(result).toContain('description="Cost"');
    expect(result).toContain('ge=0');
  });
  it('returns empty for field with no extras', () => {
    expect(buildFieldKwargs({ type: 'string' })).toBe('');
  });
});

describe('collectImports', () => {
  it('collects uuid and date imports', () => {
    const imports = collectImports(['uuid', 'date', 'string']);
    expect(imports).toContain('from uuid import UUID');
    expect(imports).toContain('from datetime import datetime');
    expect(imports).toHaveLength(2);
  });
});

describe('renderEntityTemplate', () => {
  it('generates valid Pydantic model', () => {
    const content = renderEntityTemplate(schema);
    expect(content).toContain('class LLMCall(BaseModel):');
    expect(content).toContain('provider: str');
    expect(content).toContain('# --- BEGIN GENERATED ---');
    expect(content).toContain('# --- END GENERATED ---');
  });
});

describe('renderTypesTemplate', () => {
  it('generates TypedDicts', () => {
    const content = renderTypesTemplate(schema);
    expect(content).toContain('class LLMCallInsert');
    expect(content).toContain('class LLMCallUpdate');
    expect(content).toContain('class LLMCallQuery');
  });
});

describe('renderRepositoryTemplate', () => {
  it('generates sqlite3 repository', () => {
    const content = renderRepositoryTemplate(schema);
    expect(content).toContain('class LLMCallRepository:');
    expect(content).toContain('def find_by_id');
    expect(content).toContain('def insert');
    expect(content).toContain('def delete');
  });
});

describe('renderTestTemplate', () => {
  it('generates pytest file', () => {
    const content = renderTestTemplate(schema);
    expect(content).toContain('class TestLLMCallEntity:');
    expect(content).toContain('class TestLLMCallRepository:');
    expect(content).toContain('import pytest');
  });
});
