/**
 * OTel hook recipe — scaffolds a SpanProcessor hook + test.
 *
 * WHY: Wraps the existing otel-hook generator into
 * the recipe system for consistent invocation.
 */

import { resolve } from 'node:path';
import type { Recipe, RecipeStep } from './recipe.types.js';
import { writeRecipeFile } from './recipe.helpers.js';
import {
  generateOtelHookContent,
  generateOtelHookTestContent,
} from '../generators/otel-hook.generator.js';

const generateHook: RecipeStep = {
  name: 'generate-otel-hook',
  description: 'Generate SpanProcessor hook',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const spanFilter = ctx.options['span-filter'] as string | undefined;
    const dir = resolve(ctx.projectRoot, 'packages/otel/src/hooks');
    const content = generateOtelHookContent({
      name,
      spanFilter: spanFilter || undefined,
    });
    return { files: [writeRecipeFile(ctx, dir, `${name}.hook.ts`, content)] };
  },
};

const generateTest: RecipeStep = {
  name: 'generate-otel-hook-test',
  description: 'Generate hook test file',
  async run(ctx) {
    const name = ctx.options['name'] as string;
    const dir = resolve(ctx.projectRoot,
      'packages/otel/src/hooks/__tests__');
    const content = generateOtelHookTestContent(name);
    return {
      files: [writeRecipeFile(ctx, dir, `${name}.hook.test.ts`, content)],
    };
  },
};

export const otelHookRecipe: Recipe = {
  name: 'otel-hook',
  description: 'Generate an OTel SpanProcessor hook with test',
  steps: [generateHook, generateTest],
};
