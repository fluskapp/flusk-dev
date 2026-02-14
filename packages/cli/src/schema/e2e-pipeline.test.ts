/**
 * E2E test for the full entity generation pipeline.
 * Tests: YAML → parse → validate → generate → verify output.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { rmSync } from 'node:fs';
import { runEntityPipeline } from './generate-entity-pipeline.js';
import { parseEntitySchema } from './entity-schema.parser.js';
import { loadEntityRegistry } from './entity-schema.registry.js';

let tempDir: string;

function setup(): void {
  tempDir = mkdtempSync(join(tmpdir(), 'flusk-e2e-'));
  mkdirSync(join(tempDir, 'packages/entities/src'), { recursive: true });
  mkdirSync(join(tempDir, 'packages/types/src'), { recursive: true });
  mkdirSync(join(tempDir, 'packages/resources/src/sqlite/sql'), { recursive: true });
  // Write base entity so generated files have valid import target
  writeFileSync(join(tempDir, 'packages/entities/src/base.entity.ts'), '');
}

function cleanup(): void {
  rmSync(tempDir, { recursive: true, force: true });
}

const VALID_YAML = `
name: TestEntity
description: A test entity for E2E
storage: [sqlite]
fields:
  title:
    type: string
    required: true
    index: true
    description: Title field
  count:
    type: integer
    min: 0
    default: 0
  active:
    type: boolean
    default: false
`;

describe('E2E Pipeline', () => {
  beforeEach(setup);
  afterEach(cleanup);

  test('full pipeline generates all files', () => {
    const yamlPath = join(tempDir, 'test.entity.yaml');
    writeFileSync(yamlPath, VALID_YAML);

    const result = runEntityPipeline(yamlPath, tempDir);
    assert.strictEqual(result.entityName, 'TestEntity');
    assert.strictEqual(result.files.length, 3);

    // Check entity file
    const entityFile = readFileSync(
      join(tempDir, 'packages/entities/src/test-entity.entity.ts'), 'utf-8');
    assert.ok(entityFile.includes('TestEntityEntitySchema'));
    assert.ok(entityFile.includes('Type.Composite'));

    // Check types file
    const typesFile = readFileSync(
      join(tempDir, 'packages/types/src/test-entity.types.ts'), 'utf-8');
    assert.ok(typesFile.includes('TestEntityInsertSchema'));
    assert.ok(typesFile.includes('TestEntityUpdateSchema'));

    // Check migration SQL
    const sqlDir = join(tempDir, 'packages/resources/src/sqlite/sql');
    const sqlFiles = readdirSync(sqlDir);
    assert.ok(sqlFiles.some((f: string) => f.endsWith('.sql')));
  });

  test('rejects invalid YAML schema', () => {
    const yamlPath = join(tempDir, 'bad.entity.yaml');
    writeFileSync(yamlPath, 'name: Bad\n');
    assert.throws(() => runEntityPipeline(yamlPath, tempDir));
  });

  test('rejects enum without values', () => {
    const yamlPath = join(tempDir, 'enum.entity.yaml');
    writeFileSync(yamlPath, `
name: EnumTest
fields:
  status:
    type: enum
    required: true
`);
    assert.throws(() => runEntityPipeline(yamlPath, tempDir));
  });
});

describe('E2E Registry', () => {
  beforeEach(setup);
  afterEach(cleanup);

  test('loads multiple entities and orders by dependency', () => {
    const entDir = join(tempDir, 'entities');
    mkdirSync(entDir, { recursive: true });

    writeFileSync(join(entDir, 'parent.entity.yaml'), `
name: Parent
fields:
  title:
    type: string
`);
    writeFileSync(join(entDir, 'child.entity.yaml'), `
name: Child
fields:
  parentId:
    type: uuid
relations:
  parent:
    entity: Parent
    type: belongs-to
    foreignKey: parentId
`);

    const registry = loadEntityRegistry(entDir);
    assert.strictEqual(registry.schemas.size, 2);
    assert.ok(registry.ordered.indexOf('Parent') < registry.ordered.indexOf('Child'));
    assert.ok(existsSync(join(entDir, '_registry.yaml')));
  });
});

describe('E2E Parser Error Cases', () => {
  beforeEach(setup);
  afterEach(cleanup);

  test('throws on malformed YAML', () => {
    const yamlPath = join(tempDir, 'bad.yaml');
    writeFileSync(yamlPath, '  :\n  bad: [unclosed');
    assert.throws(() => parseEntitySchema(yamlPath));
  });
});
