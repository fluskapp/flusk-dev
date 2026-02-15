import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseEntitySchema } from '../../packages/forge/src/schema/entity-schema.parser.js';
import { validateEntitySchema } from '../../packages/forge/src/schema/entity-schema.validator.js';
import { generateTypeBoxContent } from '../../packages/forge/src/schema/generate-typebox.js';
import { generateMigrationSql } from '../../packages/forge/src/schema/generate-migration.js';
import { runEntityPipeline } from '../../packages/forge/src/schema/generate-entity-pipeline.js';

const PROJECT_ROOT = join(import.meta.dirname, '../..');

describe('Generator pipeline (no Docker)', () => {
  let tempDir: string;
  let entityYaml: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'flusk-gen-test-'));

    entityYaml = join(tempDir, 'test-widget.entity.yaml');
    writeFileSync(entityYaml, `name: TestWidget
description: A test entity for integration testing
storage: [sqlite]

fields:
  label:
    type: string
    required: true
    description: Widget label
    min: 1

  value:
    type: number
    required: true
    description: Widget numeric value
    min: 0
    default: 0

  active:
    type: boolean
    required: true
    description: Whether widget is active
    default: true

capabilities:
  crud: true
`);
  });

  afterAll(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
    // Clean up generated test-widget files from the project
    const generatedFiles = [
      'packages/entities/src/test-widget.entity.ts',
      'packages/types/src/test-widget.types.ts',
      'packages/resources/src/sqlite/sql/test-widget.sql',
      'packages/resources/src/sqlite/repositories/test-widget.repository.ts',
      'packages/execution/src/routes/test-widget.routes.ts',
    ];
    for (const f of generatedFiles) {
      const p = join(PROJECT_ROOT, f);
      if (existsSync(p)) rmSync(p);
    }
  });

  it('parses entity YAML without errors', () => {
    const schema = parseEntitySchema(entityYaml);
    expect(schema.name).toBe('TestWidget');
    expect(Object.keys(schema.fields)).toContain('label');
    expect(Object.keys(schema.fields)).toContain('value');
    expect(Object.keys(schema.fields)).toContain('active');
  });

  it('validates entity schema successfully', () => {
    const schema = parseEntitySchema(entityYaml);
    const errors = validateEntitySchema(schema);
    expect(errors).toHaveLength(0);
  });

  it('generates TypeBox content from schema', () => {
    const schema = parseEntitySchema(entityYaml);
    const content = generateTypeBoxContent(schema);
    expect(content).toContain('TestWidget');
    expect(content).toContain('label');
    expect(content).toContain('value');
    expect(content).toContain('active');
  });

  it('generates migration SQL from schema', () => {
    const schema = parseEntitySchema(entityYaml);
    const sql = generateMigrationSql(schema);
    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('test_widget');
    expect(sql).toContain('label');
    expect(sql).toContain('value');
  });

  it('runs full entity pipeline and generates files', () => {
    const result = runEntityPipeline(entityYaml, PROJECT_ROOT);
    expect(result.entityName).toBe('TestWidget');
    expect(result.files.length).toBeGreaterThan(0);

    // file.path is absolute
    for (const file of result.files) {
      expect(existsSync(file.path), `Expected ${file.path} to exist`).toBe(true);
      const content = readFileSync(file.path, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('generated files are non-empty and readable', () => {
    const result = runEntityPipeline(entityYaml, PROJECT_ROOT);

    for (const file of result.files) {
      const content = readFileSync(file.path, 'utf-8');
      expect(content.length, `${file.path} should be non-empty`).toBeGreaterThan(0);
    }

    // Entity and types files should have TypeBox imports
    const entityFiles = result.files.filter((f) =>
      f.path.endsWith('.entity.ts') || f.path.endsWith('.types.ts'),
    );
    expect(entityFiles.length).toBeGreaterThan(0);
    for (const file of entityFiles) {
      const content = readFileSync(file.path, 'utf-8');
      expect(
        content.includes('import') || content.includes('export'),
        `${file.path} should have imports or exports`,
      ).toBe(true);
    }
  });
});
