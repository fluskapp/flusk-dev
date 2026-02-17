/**
 * Python package recipe steps.
 *
 * WHY: Keeps the recipe file under 100 lines by extracting
 * step definitions into a separate module.
 */

import { resolve } from 'node:path';
import { readdir, copyFile, mkdir, writeFile } from 'node:fs/promises';
import type { RecipeStep, StepResult } from './recipe.types.js';
import { parseEntitySchema } from '../schema/entity-schema.parser.js';
import { generatePyproject } from '../generators/python/pyproject.generator.js';
import { generatePythonEntity, generateBaseEntity } from '../generators/python/entity.generator.js';
import { generatePythonTypes } from '../generators/python/types.generator.js';
import { generatePythonRepository } from '../generators/python/repository.generator.js';
import { generatePythonTest } from '../generators/python/test.generator.js';
import { generatePythonInit, generateEmptyInit, generateRootInit, listModules } from '../generators/python/init.generator.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';

export const pyprojectStep: RecipeStep = {
  name: 'pyproject',
  description: 'Generate pyproject.toml',
  async run(ctx): Promise<StepResult> {
    const r = await generatePyproject(ctx.projectRoot);
    return { files: [{ path: r.path, action: 'created' }] };
  },
};

export const parseEntitiesStep: RecipeStep = {
  name: 'parse-entities',
  description: 'Parse all entity YAML schemas',
  async run(ctx): Promise<StepResult> {
    const schemaDir = resolve(ctx.projectRoot, 'packages/schema/entities');
    const yamlFiles = (await readdir(schemaDir)).filter((f) => f.endsWith('.entity.yaml'));
    const schemas = yamlFiles.map((f) => parseEntitySchema(resolve(schemaDir, f)));
    return { files: [], shared: { schemas } };
  },
};

export const generateAllStep: RecipeStep = {
  name: 'generate-all',
  description: 'Generate Python files for all entities',
  async run(ctx): Promise<StepResult> {
    const schemas = ctx.shared['schemas'] as EntitySchema[];
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];
    const base = await generateBaseEntity(ctx.projectRoot);
    files.push({ path: base.path, action: 'created' });
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

export const copyMigrationsStep: RecipeStep = {
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

export const initFilesStep: RecipeStep = {
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
    const entityMods = await listModules(resolve(root, 'entities'));
    const entityModsNoBase = entityMods.filter((m) => m !== 'base');
    await generateRootInit(root, entityModsNoBase);
    for (const d of ['storage', 'storage/sqlite']) {
      await generateEmptyInit(resolve(root, d));
    }
    await writeFile(resolve(root, 'py.typed'), '', 'utf-8');
    files.push({ path: 'flusk-py/src/flusk/py.typed', action: 'created' });
    return { files };
  },
};
