#!/usr/bin/env node
// Run from project root: node --import=tsx run-recipe.mjs entities/foo.entity.yaml
// Must be run with NODE_PATH including packages/cli/node_modules

import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawPath = process.argv[2];
if (!rawPath) { console.error('Usage: run-recipe.mjs <yaml-path>'); process.exit(1); }

const yamlPath = resolve(process.cwd(), rawPath);
const relPath = yamlPath.startsWith(__dirname) ? yamlPath.slice(__dirname.length + 1) : yamlPath;

const { registerDefaultRecipes } = await import('./packages/cli/src/recipes/register-defaults.ts');
const { getRecipe } = await import('./packages/cli/src/recipes/recipe.registry.ts');
const { runRecipe } = await import('./packages/cli/src/recipes/recipe.runner.ts');
const { createContext } = await import('./packages/cli/src/recipes/recipe.helpers.ts');

registerDefaultRecipes();
const recipe = getRecipe('full-entity');
const ctx = createContext(__dirname, { from: relPath }, false);
const result = await runRecipe(recipe, ctx);
console.log(`✨ Generated ${result.files.length} files in ${result.totalMs}ms`);
