/**
 * Register all built-in recipes at startup.
 *
 * WHY: Centralizes recipe registration so the CLI and tests
 * can call one function to load all available recipes.
 */

import { registerRecipe, clearRecipes } from './recipe.registry.js';
import { fullEntityRecipe } from './full-entity.recipe.js';
import { cliCommandRecipe } from './cli-command.recipe.js';
import { fastifyPluginRecipe } from './fastify-plugin.recipe.js';

let registered = false;

/** Register all built-in recipes (idempotent) */
export function registerDefaultRecipes(): void {
  if (registered) return;
  registerRecipe(fullEntityRecipe);
  registerRecipe(cliCommandRecipe);
  registerRecipe(fastifyPluginRecipe);
  registered = true;
}

/** Clear and re-register (for testing) */
export function resetDefaultRecipes(): void {
  clearRecipes();
  registered = false;
  registerDefaultRecipes();
}
