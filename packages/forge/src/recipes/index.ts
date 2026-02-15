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
export { middlewareRecipe } from './middleware.recipe.js';
export { routeRecipe } from './route.recipe.js';
export { businessLogicRecipe } from './business-logic.recipe.js';
export { clientRecipe } from './client.recipe.js';
export { otelHookRecipe } from './otel-hook.recipe.js';
export { loggerRecipe } from './logger.recipe.js';
export { sdkProviderRecipe } from './sdk-provider.recipe.js';
export { sqliteRepoRecipe } from './sqlite-repo.recipe.js';
export { registerDefaultRecipes, resetDefaultRecipes } from './register-defaults.js';
