/**
 * Python syntax validation — ensures generated .py files compile.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
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

const tmpDir = resolve(import.meta.dirname ?? __dirname, '..', '__tmp_py');

function compilePython(name: string, content: string): void {
  const filePath = resolve(tmpDir, `${name}.py`);
  writeFileSync(filePath, content, 'utf-8');
  execSync(`python3 -m py_compile ${filePath}`);
}

describe('Python syntax validation', () => {
  beforeAll(() => mkdirSync(tmpDir, { recursive: true }));
  afterAll(() => rmSync(tmpDir, { recursive: true, force: true }));

  it('entity compiles', () => {
    expect(() => compilePython('entity', renderEntityTemplate(schema))).not.toThrow();
  });

  it('types compiles', () => {
    expect(() => compilePython('types', renderTypesTemplate(schema))).not.toThrow();
  });

  it('repository compiles', () => {
    expect(() => compilePython('repo', renderRepositoryTemplate(schema))).not.toThrow();
  });

  it('test file compiles', () => {
    expect(() => compilePython('test_file', renderTestTemplate(schema))).not.toThrow();
  });
});
