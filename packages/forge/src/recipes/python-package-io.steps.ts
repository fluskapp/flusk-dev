/**
 * Python package recipe I/O steps — copy migrations and init files.
 */

import { resolve } from 'node:path';
import { readdir, copyFile, mkdir, writeFile } from 'node:fs/promises';
import type { RecipeStep, StepResult } from './recipe.types.js';
import {
  generatePythonInit,
  generateEmptyInit,
  generateRootInit,
  listModules,
} from '../generators/python/init.generator.js';

export const copyMigrationsStep: RecipeStep = {
  name: 'copy-migrations',
  description: 'Copy SQL migration files',
  async run(ctx): Promise<StepResult> {
    const srcDir = resolve(
      ctx.projectRoot,
      'packages/resources/src/sqlite/sql',
    );
    const destDir = resolve(
      ctx.projectRoot,
      'flusk-py/src/flusk/storage/sqlite/migrations',
    );
    await mkdir(destDir, { recursive: true });
    const sqlFiles = (await readdir(srcDir)).filter((f) => f.endsWith('.sql'));
    const files: Array<{ path: string; action: 'created' | 'updated' }> = [];
    for (const f of sqlFiles) {
      await copyFile(resolve(srcDir, f), resolve(destDir, f));
      files.push({
        path: `flusk-py/src/flusk/storage/sqlite/migrations/${f}`,
        action: 'created',
      });
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
      files.push({
        path: `flusk-py/src/flusk/${d}/__init__.py`,
        action: 'created',
      });
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
