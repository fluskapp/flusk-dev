/**
 * E2E test: YAML with capabilities → full generated output.
 * Tests the complete pipeline from YAML to trait-composed files.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { clearRegistry } from './trait.registry.js';
import { resetDefaultTraits } from './register-defaults.js';
import { runEntityPipeline } from '../schema/generate-entity-pipeline.js';

let tempDir: string;

const YAML_WITH_TRAITS = `
name: Invoice
description: An invoice with cost tracking
storage: [sqlite]
fields:
  amount:
    type: number
    required: true
    min: 0
    description: Invoice amount in USD
  status:
    type: enum
    values: [draft, sent, paid]
    required: true
  customerName:
    type: string
    required: true
capabilities:
  crud: true
  time-range: true
  aggregation: true
  export: true
`;

describe('Traits E2E', () => {
  beforeEach(() => {
    clearRegistry();
    resetDefaultTraits();
    tempDir = mkdtempSync(join(tmpdir(), 'flusk-traits-e2e-'));
    mkdirSync(join(tempDir, 'packages/entities/src'), { recursive: true });
    mkdirSync(join(tempDir, 'packages/types/src'), { recursive: true });
    mkdirSync(join(tempDir, 'packages/resources/src/sqlite/sql'), {
      recursive: true,
    });
    writeFileSync(
      join(tempDir, 'packages/entities/src/base.entity.ts'), '',
    );
  });

  afterEach(() => rmSync(tempDir, { recursive: true, force: true }));

  test('generates repository with trait sections', () => {
    const yamlPath = join(tempDir, 'invoice.entity.yaml');
    writeFileSync(yamlPath, YAML_WITH_TRAITS);

    const result = runEntityPipeline(yamlPath, tempDir);
    assert.strictEqual(result.entityName, 'Invoice');
    assert.deepStrictEqual(
      result.traits,
      ['crud', 'time-range', 'aggregation', 'export'],
    );

    const repoPath = join(tempDir,
      'packages/resources/src/sqlite/repositories/invoice.repository.ts');
    assert.ok(existsSync(repoPath), 'Repository file should exist');

    const repo = readFileSync(repoPath, 'utf-8');
    assert.ok(repo.includes('createInvoice'), 'Should have CRUD create');
    assert.ok(repo.includes('findInvoicesByTimeRange'), 'Should have time-range');
    assert.ok(repo.includes('aggregateInvoices'), 'Should have aggregation');
    assert.ok(repo.includes('exportInvoicesToCsv'), 'Should have export');
    assert.ok(repo.includes('@generated'), 'Should have generated header');
    assert.ok(repo.includes('BEGIN CUSTOM'), 'Should have custom section');
  });

  test('generates rowToEntity with proper type conversions', () => {
    const yamlPath = join(tempDir, 'invoice.entity.yaml');
    writeFileSync(yamlPath, YAML_WITH_TRAITS);
    runEntityPipeline(yamlPath, tempDir);

    const repoPath = join(tempDir,
      'packages/resources/src/sqlite/repositories/invoice.repository.ts');
    const repo = readFileSync(repoPath, 'utf-8');

    assert.ok(repo.includes('rowToEntity'), 'Should have rowToEntity mapper');
    assert.ok(repo.includes('toISOString(row.created_at)'), 'Should map created_at');
    assert.ok(repo.includes('toISOString(row.updated_at)'), 'Should map updated_at');
    assert.ok(repo.includes('row.customer_name as string'), 'Should snake→camel');
    assert.ok(repo.includes('Record<string, unknown>'), 'Should type rows properly');
  });

  test('generates create with type conversions for json/boolean', () => {
    const yaml = `
name: Widget
storage: [sqlite]
fields:
  label:
    type: string
    required: true
  active:
    type: boolean
    required: true
  metadata:
    type: json
    required: true
  note:
    type: string
capabilities:
  crud: true
`;
    const yamlPath = join(tempDir, 'widget.entity.yaml');
    writeFileSync(yamlPath, yaml);
    runEntityPipeline(yamlPath, tempDir);

    const repoPath = join(tempDir,
      'packages/resources/src/sqlite/repositories/widget.repository.ts');
    const repo = readFileSync(repoPath, 'utf-8');

    assert.ok(repo.includes('Boolean(row.active)'), 'rowToEntity should convert boolean');
    assert.ok(repo.includes('JSON.parse(row.metadata as string)'), 'rowToEntity should parse JSON');
    assert.ok(repo.includes('data.active ? 1 : 0'), 'create should convert bool→int');
    assert.ok(repo.includes('JSON.stringify(data.metadata)'), 'create should stringify JSON');
    assert.ok(repo.includes('data.note ?? null'), 'create should handle optional');
    assert.ok(repo.includes('(row.note as string) ?? undefined'), 'rowToEntity should handle optional');
    assert.ok(repo.includes('convertValueForDb'), 'update should use convertValueForDb');
  });

  test('generates route file with all trait routes', () => {
    const yamlPath = join(tempDir, 'invoice.entity.yaml');
    writeFileSync(yamlPath, YAML_WITH_TRAITS);

    runEntityPipeline(yamlPath, tempDir);

    const routePath = join(tempDir,
      'packages/execution/src/routes/invoice.routes.ts');
    assert.ok(existsSync(routePath), 'Route file should exist');

    const route = readFileSync(routePath, 'utf-8');
    assert.ok(route.includes('invoices'), 'Should have entity routes');
  });

  test('generates trait migration SQL', () => {
    const yamlPath = join(tempDir, 'invoice.entity.yaml');
    writeFileSync(yamlPath, YAML_WITH_TRAITS);

    runEntityPipeline(yamlPath, tempDir);

    const migPath = join(tempDir,
      'packages/resources/src/sqlite/sql/invoice-traits.sql');
    assert.ok(existsSync(migPath), 'Trait migration should exist');

    const sql = readFileSync(migPath, 'utf-8');
    assert.ok(sql.includes('idx_'), 'Should have index creation');
  });

  test('handles entity with no capabilities', () => {
    const yaml = `
name: SimpleEntity
fields:
  title:
    type: string
    required: true
`;
    const yamlPath = join(tempDir, 'simple.entity.yaml');
    writeFileSync(yamlPath, yaml);

    const result = runEntityPipeline(yamlPath, tempDir);
    assert.deepStrictEqual(result.traits, []);
    assert.strictEqual(result.files.length, 3); // entity, types, migration
  });

  test('soft-delete trait pulls in crud dependency', () => {
    const yaml = `
name: Archivable
fields:
  content:
    type: string
    required: true
capabilities:
  soft-delete: true
`;
    const yamlPath = join(tempDir, 'archivable.entity.yaml');
    writeFileSync(yamlPath, yaml);

    const result = runEntityPipeline(yamlPath, tempDir);
    assert.ok(result.traits.includes('crud'), 'Should auto-include crud');
    assert.ok(result.traits.includes('soft-delete'));

    const repoPath = join(tempDir,
      'packages/resources/src/sqlite/repositories/archivable.repository.ts');
    const repo = readFileSync(repoPath, 'utf-8');
    assert.ok(repo.includes('createArchivable'), 'crud dependency resolved');
    assert.ok(repo.includes('softDeleteArchivable'), 'soft-delete present');
  });
});
