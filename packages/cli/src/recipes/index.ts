/**
 * Recipes system barrel — public API for recipe-based generation.
 */

export type {
  Recipe,
  RecipeStep,
  RecipeContext,
  RecipeResult,
  RecipeHooks,
  StepResult,
  StepLog,
} from './recipe.types.js';
export { runRecipe } from './recipe.runner.js';
export {
  registerRecipe,
  getRecipe,
  listRecipes,
  clearRecipes,
} from './recipe.registry.js';
export { writeRecipeFile, emptyResult, createContext } from './recipe.helpers.js';
export { fullEntityRecipe } from './full-entity.recipe.js';
export { cliCommandRecipe } from './cli-command.recipe.js';
export { fastifyPluginRecipe } from './fastify-plugin.recipe.js';
export { registerDefaultRecipes, resetDefaultRecipes } from './register-defaults.js';
