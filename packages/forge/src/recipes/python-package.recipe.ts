/**
 * Python package recipe — generates complete flusk-py/ from YAML.
 *
 * WHY: Orchestrates all Python generators into a single pipeline.
 * One command produces the entire Python package structure.
 */

import { resolve } from 'node:path';
import { readdir, copyFile, mkdir, writeFile } from 'node:fs/promises';
import type { Recipe, RecipeStep, StepResult } from './recipe.types.js';
import { parseEntitySchema } from '../schema/entity-schema.parser.js';
import { generatePyproject } from '../generators/python/pyproject.generator.js';
import { generatePythonEntity } from '../generators/python/entity.generator.js';
import { generatePythonTypes } from '../generators/python/types.generator.js';
import { generatePythonRepository } from '../generators/python/repository.generator.js';
import { generatePythonTest } from '../generators/python/test.generator.js';
import { generatePythonInit, generateEmptyInit, listModules } from '../generators/python/init.generator.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';

/** Step 1: Generate pyproject.toml */
const pyprojectStep: RecipeStep = {
  name: 'pyproject',
  description: 'Generate pyproject.toml',
  async run(ctx): Promise<StepResult> {
    const r = await generatePyproject(ctx.projectRoot);
    return { files: [{ path: r.path, action: 'created' }] };
  },
};

/** Step 2: Parse all entity YAMLs */
const parseEntitiesStep: RecipeStep = {
  name: 'parse-entities',
  description: 'Parse all entity YAML schemas',
  async run(ctx): Promise<StepResult> {
    const schemaDir = resolve(ctx.projectRoot, 'packages/schema/entities');
    const yamlFiles = (await readdir(schemaDir)).filter((f) => f.endsWith('.entity.yaml'));
    const schemas = yamlFiles.map((f) => parseEntitySchema(resolve(schemaDir, f)));
    return { files: [], shared: { schemas } };
  },
};

/** Step 3: Generate entity, types, repo, test for each schema */
const generateAllStep: RecipeStep = {
  name: 'generate-all',
  description: 'Generate Python files for all entities',
  async run(ctx): Promise<StepResult> {
    const schemas = ctx.shared['schemas'] as EntitySchema[];
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];

    for (const schema of schemas) {
      const [entity, types, repo, test] = await Promise.all([
        generatePythonEntity(schema, ctx.projectRoot),
        generatePythonTypes(schema, ctx.projectRoot),
        generatePythonRepository(schema, ctx.projectRoot),
        generatePythonTest(schema, ctx.projectRoot),
      ]);
      files.push(
        { path: entity.path, action: 'created' },
        { path: types.path, action: 'created' },
        { path: repo.path, action: 'created' },
        { path: test.path, action: 'created' },
      );
    }
    return { files };
  },
};

/** Step 4: Copy SQL migrations */
const copyMigrationsStep: RecipeStep = {
  name: 'copy-migrations',
  description: 'Copy SQL migration files',
  async run(ctx): Promise<StepResult> {
    const srcDir = resolve(ctx.projectRoot, 'packages/resources/src/sqlite/sql');
    const destDir = resolve(ctx.projectRoot, 'flusk-py/src/flusk/storage/sqlite/migrations');
    await mkdir(destDir, { recursive: true });

    const sqlFiles = (await readdir(srcDir)).filter((f) => f.endsWith('.sql'));
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];
    for (const f of sqlFiles) {
      await copyFile(resolve(srcDir, f), resolve(destDir, f));
      files.push({ path: `flusk-py/src/flusk/storage/sqlite/migrations/${f}`, action: 'created' });
    }
    return { files };
  },
};

/** Step 5: Generate __init__.py files + py.typed marker */
const initFilesStep: RecipeStep = {
  name: 'init-files',
  description: 'Generate __init__.py and py.typed',
  async run(ctx): Promise<StepResult> {
    const root = resolve(ctx.projectRoot, 'flusk-py/src/flusk');
    const dirs = ['entities', 'types', 'storage/sqlite/repositories'];
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];

    for (const d of dirs) {
      const dir = resolve(root, d);
      const mods = await listModules(dir);
      await generatePythonInit(dir, mods);
      files.push({ path: `flusk-py/src/flusk/${d}/__init__.py`, action: 'created' });
    }

    // Empty inits for intermediate packages
    for (const d of ['', 'storage', 'storage/sqlite', 'cli']) {
      await generateEmptyInit(resolve(root, d));
    }

    // py.typed marker
    await writeFile(resolve(root, 'py.typed'), '', 'utf-8');
    files.push({ path: 'flusk-py/src/flusk/py.typed', action: 'created' });

    return { files };
  },
};

export const pythonPackageRecipe: Recipe = {
  name: 'python-package',
  description: 'Generate complete Python package from entity YAMLs',
  steps: [pyprojectStep, parseEntitiesStep, generateAllStep, copyMigrationsStep, initFilesStep],
};
