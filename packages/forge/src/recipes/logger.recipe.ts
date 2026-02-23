/**
 * Logger recipe — scaffolds a logger package from config.
 *
 * WHY: Logger packages follow a pattern: factory function,
 * singleton getter, types, levels. This generates the full
 * package structure.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import {
  typesTemplate,
  levelsTemplate,
  barrelTemplate,
} from './logger-recipe-templates.js';
import {
  factoryTemplate,
  singletonTemplate,
} from './logger-recipe-code-templates.js';

const generateTypes: RecipeStep = {
  name: 'generate-types',
  description: 'Generate logger types',
  async run(ctx) {
    const name = (ctx.options['name'] as string) ?? 'logger';
    const pkg = (ctx.options['package'] as string) ?? name;
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src`);
    const content = typesTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, 'types.ts', content)] };
  },
};

const generateLevels: RecipeStep = {
  name: 'generate-levels',
  description: 'Generate log level constants',
  async run(ctx) {
    const pkg = (ctx.options['package'] as string) ?? 'logger';
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src`);
    return { files: [writeRecipeFile(ctx, dir, 'levels.ts', levelsTemplate())] };
  },
};

const generateFactory: RecipeStep = {
  name: 'generate-factory',
  description: 'Generate logger factory',
  async run(ctx) {
    const name = (ctx.options['name'] as string) ?? 'logger';
    const pkg = (ctx.options['package'] as string) ?? name;
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src`);
    const content = factoryTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, 'create-logger.ts', content)] };
  },
};

const generateSingleton: RecipeStep = {
  name: 'generate-singleton',
  description: 'Generate singleton logger',
  async run(ctx) {
    const pkg = (ctx.options['package'] as string) ?? 'logger';
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src`);
    return { files: [writeRecipeFile(ctx, dir, 'logger.ts', singletonTemplate())] };
  },
};

const generateBarrel: RecipeStep = {
  name: 'generate-barrel',
  description: 'Generate logger barrel export',
  async run(ctx) {
    const pkg = (ctx.options['package'] as string) ?? 'logger';
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src`);
    return { files: [writeRecipeFile(ctx, dir, 'index.ts', barrelTemplate())] };
  },
};

export const loggerRecipe: Recipe = {
  name: 'logger',
  description: 'Generate a structured logger package',
  steps: [generateTypes, generateLevels, generateFactory, generateSingleton, generateBarrel],
};
