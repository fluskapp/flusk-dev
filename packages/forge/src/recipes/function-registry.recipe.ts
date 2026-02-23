/**
 * Function registry recipe — scans all .fn.yaml files and generates
 * TypeScript + Python implementations, tests, barrels, and a registry manifest.
 *
 * WHY: All pure functions are defined in YAML. Running this recipe
 * keeps generated code in sync across TypeScript and Python.
 */

import type { Recipe } from './recipe.types.js';
import { generateTsStep } from './function-registry-steps-ts.js';
import {
  generatePyStep,
  generateRegistryStep,
  ensureTestsInitStep,
} from './function-registry-steps-py.js';

export const functionRegistryRecipe: Recipe = {
  name: 'function-registry',
  description: 'Generate all pure functions (TypeScript + Python) from .fn.yaml schemas',
  steps: [ensureTestsInitStep, generateTsStep, generatePyStep, generateRegistryStep],
};
