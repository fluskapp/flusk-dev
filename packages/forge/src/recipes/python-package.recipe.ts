/**
 * Python package recipe — generates complete flusk-py/ from YAML.
 *
 * WHY: Orchestrates all Python generators into a single pipeline.
 * One command produces the entire Python package structure.
 */

import type { Recipe } from './recipe.types.js';
import {
  pyprojectStep,
  parseEntitiesStep,
  generateAllStep,
  copyMigrationsStep,
  initFilesStep,
} from './python-package.steps.js';

export const pythonPackageRecipe: Recipe = {
  name: 'python-package',
  description: 'Generate complete Python package from entity YAMLs',
  steps: [pyprojectStep, parseEntitiesStep, generateAllStep, copyMigrationsStep, initFilesStep],
};
