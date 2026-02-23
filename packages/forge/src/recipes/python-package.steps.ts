/**
 * Python package recipe steps.
 *
 * WHY: Keeps the recipe file under 100 lines by extracting
 * step definitions into a separate module.
 */

import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';
import type { RecipeStep, StepResult } from './recipe.types.js';
import { parseEntitySchema } from '../schema/entity-schema.parser.js';
import { generatePyproject } from '../generators/python/pyproject.generator.js';
import { generatePythonEntity, generateBaseEntity } from '../generators/python/entity.generator.js';
import { generatePythonTypes } from '../generators/python/types.generator.js';
import { generatePythonRepository } from '../generators/python/repository.generator.js';
import { generatePythonTest } from '../generators/python/test.generator.js';
import type { EntitySchema } from '../schema/entity-schema.types.js';

export { copyMigrationsStep, initFilesStep } from './python-package-io.steps.js';

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
    const yamlFiles = (await readdir(schemaDir)).filter(
      (f) => f.endsWith('.entity.yaml'),
    );
    const schemas = yamlFiles.map((f) =>
      parseEntitySchema(resolve(schemaDir, f)),
    );
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
