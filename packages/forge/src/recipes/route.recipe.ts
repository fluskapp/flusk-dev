/**
 * Standalone route recipe — scaffolds a Fastify route directory.
 *
 * WHY: Routes follow a consistent pattern (index.ts for registration,
 * handler file with schema). This wraps the route generator for
 * the recipe system.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import { indexTemplate, handlerTemplate, testTemplate } from './route-templates.js';

const generateIndex: RecipeStep = {
  name: 'generate-route-index',
  description: 'Generate route index (registration)',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const pkg = (ctx.options['package'] as string) ?? 'execution';
    const dir = resolve(ctx.projectRoot,
      `packages/${pkg}/src/routes/${name}-routes`);
    const content = indexTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, 'index.ts', content)] };
  },
};

const generateHandler: RecipeStep = {
  name: 'generate-route-handler',
  description: 'Generate route handler file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const pkg = (ctx.options['package'] as string) ?? 'execution';
    const dir = resolve(ctx.projectRoot,
      `packages/${pkg}/src/routes/${name}-routes`);
    const content = handlerTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, `${name}.ts`, content)] };
  },
};

const generateTest: RecipeStep = {
  name: 'generate-route-test',
  description: 'Generate route test file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const pkg = (ctx.options['package'] as string) ?? 'execution';
    const dir = resolve(ctx.projectRoot,
      `packages/${pkg}/src/routes/${name}-routes`);
    const content = testTemplate(name);
    return { files: [writeRecipeFile(ctx, dir, `${name}.test.ts`, content)] };
  },
};

export const routeRecipe: Recipe = {
  name: 'route',
  description: 'Generate a standalone Fastify route with handler and test',
  steps: [generateIndex, generateHandler, generateTest],
};
