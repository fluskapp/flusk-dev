/**
 * TypeScript generation step for function registry recipe.
 */

import type { RecipeStep } from './recipe.types.js';
import {
  generateFunction,
  updateNamespaceBarrel,
  updatePrimitivesBarrel,
} from '../generators/function.generator.js';
import { scanFnYamls } from './function-registry-scan.js';

/** Generate TypeScript functions + tests */
export const generateTsStep: RecipeStep = {
  name: 'generate-ts-functions',
  description: 'Generate TypeScript functions and tests from .fn.yaml files',
  async run(ctx) {
    const yamlMap = await scanFnYamls(ctx.projectRoot);
    const allFiles: Array<{ path: string; action: 'created' | 'updated' }> = [];
    const namespaces = [...yamlMap.keys()];

    for (const [, yamls] of yamlMap) {
      for (const yamlPath of yamls) {
        const result = await generateFunction(yamlPath, ctx.projectRoot);
        allFiles.push(...result.files);
      }
    }

    for (const ns of namespaces) {
      allFiles.push(await updateNamespaceBarrel(ns, ctx.projectRoot));
    }
    allFiles.push(await updatePrimitivesBarrel(namespaces, ctx.projectRoot));

    ctx.shared['namespaces'] = namespaces;
    return { files: allFiles, shared: { namespaces } };
  },
};
