/**
 * E2E tests: run full recipes on temp directories and verify output.
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync, rmSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runRecipe } from './recipe.runner.js';
import { createContext } from './recipe.helpers.js';
import { fullEntityRecipe } from './full-entity.recipe.js';
import { cliCommandRecipe } from './cli-command.recipe.js';
import { fastifyPluginRecipe } from './fastify-plugin.recipe.js';
import { clearRegistry } from '../traits/trait.registry.js';
import { resetDefaultTraits } from '../traits/register-defaults.js';

const ENTITY_YAML = `
name: TestWidget
description: A test widget
storage: [sqlite]
fields:
  title:
    type: string
    required: true
    index: true
    description: Widget title
  count:
    type: integer
    min: 0
capabilities:
  crud: true
`;

/** Create a fresh temp dir with required package structure */
function makeTempProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'flusk-recipe-e2e-'));
  mkdirSync(join(dir, 'packages/entities/src'), { recursive: true });
  mkdirSync(join(dir, 'packages/types/src'), { recursive: true });
  mkdirSync(join(dir, 'packages/resources/src/sqlite/sql'), { recursive: true });
  mkdirSync(join(dir, 'packages/resources/src/sqlite/repositories'), { recursive: true });
  mkdirSync(join(dir, 'packages/execution/src/routes'), { recursive: true });
  writeFileSync(join(dir, 'packages/entities/src/index.ts'), '');
  writeFileSync(join(dir, 'packages/types/src/index.ts'), '');
  writeFileSync(join(dir, 'packages/resources/src/index.ts'), '');
  return dir;
}

describe('E2E: full-entity recipe', () => {
  let tempDir: string;
  beforeEach(() => { clearRegistry(); resetDefaultTraits(); tempDir = makeTempProject(); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  test('generates all entity files from YAML', async () => {
    const yamlPath = join(tempDir, 'test.entity.yaml');
    writeFileSync(yamlPath, ENTITY_YAML);
    const ctx = createContext(tempDir, { from: yamlPath });
    const result = await runRecipe(fullEntityRecipe, ctx);

    assert.strictEqual(result.recipeName, 'full-entity');
    assert.ok(result.files.length >= 4, `Expected >=4 files, got ${result.files.length}`);
    assert.ok(existsSync(join(tempDir, 'packages/entities/src/test-widget.entity.ts')));
    assert.ok(existsSync(join(tempDir, 'packages/types/src/test-widget.types.ts')));
    assert.ok(existsSync(join(tempDir, 'packages/resources/src/sqlite/sql/test-widget.sql')));
    assert.ok(existsSync(join(tempDir,
      'packages/resources/src/sqlite/repositories/test-widget.repository.ts')));
  });

  test('dry-run produces no files', async () => {
    const yamlPath = join(tempDir, 'test.entity.yaml');
    writeFileSync(yamlPath, ENTITY_YAML);
    const ctx = createContext(tempDir, { from: yamlPath }, true);
    const result = await runRecipe(fullEntityRecipe, ctx);

    assert.strictEqual(result.dryRun, true);
    assert.ok(!existsSync(join(tempDir,
      'packages/entities/src/test-widget.entity.ts')), 'Dry-run should not create files');
  });

  test('rejects invalid YAML', async () => {
    const yamlPath = join(tempDir, 'bad.yaml');
    writeFileSync(yamlPath, 'name: Bad\n');
    const ctx = createContext(tempDir, { from: yamlPath });
    await assert.rejects(() => runRecipe(fullEntityRecipe, ctx));
  });
});

describe('E2E: cli-command recipe', () => {
  let tempDir: string;
  beforeEach(() => { tempDir = makeTempProject(); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  test('generates command and test files', async () => {
    mkdirSync(join(tempDir, 'packages/cli/src/commands'), { recursive: true });
    const ctx = createContext(tempDir, { name: 'my-cmd', description: 'Do something cool' });
    const result = await runRecipe(cliCommandRecipe, ctx);

    assert.strictEqual(result.recipeName, 'cli-command');
    assert.strictEqual(result.files.length, 2);

    const cmdFile = readFileSync(join(tempDir, 'packages/cli/src/commands/my-cmd.ts'), 'utf-8');
    assert.ok(cmdFile.includes("'my-cmd'"));
    assert.ok(cmdFile.includes('Do something cool'));

    const testFile = readFileSync(
      join(tempDir, 'packages/cli/src/commands/my-cmd.test.ts'), 'utf-8');
    assert.ok(testFile.includes('mYCMDCommand'));
  });
});

describe('E2E: fastify-plugin recipe', () => {
  let tempDir: string;
  beforeEach(() => { tempDir = makeTempProject(); });
  afterEach(() => { rmSync(tempDir, { recursive: true, force: true }); });

  test('generates plugin and test files', async () => {
    const ctx = createContext(tempDir, { name: 'rate-limiter' });
    const result = await runRecipe(fastifyPluginRecipe, ctx);

    assert.strictEqual(result.recipeName, 'fastify-plugin');
    assert.strictEqual(result.files.length, 2);

    const pluginPath = join(tempDir, 'packages/otel/src/plugins/rate-limiter.plugin.ts');
    assert.ok(existsSync(pluginPath), 'Plugin file missing');
    assert.ok(readFileSync(pluginPath, 'utf-8').includes('rateLimiterPluginFp'));
  });
});
