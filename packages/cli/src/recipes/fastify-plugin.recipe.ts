/** @generated —
 * Fastify plugin recipe — scaffolds plugin + test.
 *
 * WHY: Wraps the existing fastify-plugin generator into
 * the recipe system so it can be invoked via `flusk recipe`.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import {
  generateFastifyPluginContent,
  generateFastifyPluginTestContent,
} from '../generators/fastify-plugin.generator.js';

/** Generate the plugin file */
const generatePlugin: RecipeStep = {
  name: 'generate-plugin',
  description: 'Generate Fastify plugin with fp wrapper',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const pkg = (ctx.options['package'] as string) ?? 'otel';
    const dir = resolve(ctx.projectRoot, `packages/${pkg}/src/plugins`);
    const content = generateFastifyPluginContent({
      name,
      withConfig: ctx.options['with-config'] === true,
      withDecorator: ctx.options['with-decorator'] === true,
    });
    return { files: [writeRecipeFile(ctx, dir, `${name}.plugin.ts`, content)] };
  },
};

/** Generate the test file */
const generateTest: RecipeStep = {
  name: 'generate-test',
  description: 'Generate plugin test file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const pkg = (ctx.options['package'] as string) ?? 'otel';
    const dir = resolve(ctx.projectRoot,
      `packages/${pkg}/src/plugins/__tests__`);
    const content = generateFastifyPluginTestContent(name);
    return {
      files: [writeRecipeFile(ctx, dir, `${name}.plugin.test.ts`, content)],
    };
  },
};

export const fastifyPluginRecipe: Recipe = {
  name: 'fastify-plugin',
  description: 'Generate a Fastify plugin with test',
  steps: [generatePlugin, generateTest],
};
