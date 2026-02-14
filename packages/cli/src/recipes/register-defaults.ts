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
import { middlewareRecipe } from './middleware.recipe.js';
import { routeRecipe } from './route.recipe.js';
import { businessLogicRecipe } from './business-logic.recipe.js';
import { clientRecipe } from './client.recipe.js';
import { otelHookRecipe } from './otel-hook.recipe.js';
import { loggerRecipe } from './logger.recipe.js';
import { sdkProviderRecipe } from './sdk-provider.recipe.js';

let registered = false;

/** Register all built-in recipes (idempotent) */
export function registerDefaultRecipes(): void {
  if (registered) return;
  registerRecipe(fullEntityRecipe);
  registerRecipe(cliCommandRecipe);
  registerRecipe(fastifyPluginRecipe);
  registerRecipe(middlewareRecipe);
  registerRecipe(routeRecipe);
  registerRecipe(businessLogicRecipe);
  registerRecipe(clientRecipe);
  registerRecipe(otelHookRecipe);
  registerRecipe(loggerRecipe);
  registerRecipe(sdkProviderRecipe);
  registered = true;
}

/** Clear and re-register (for testing) */
export function resetDefaultRecipes(): void {
  clearRecipes();
  registered = false;
  registerDefaultRecipes();
}
