/** @generated —
 * Registry of available recipes — register + lookup by name.
 *
 * WHY: Decouples recipe definitions from the CLI layer.
 * Recipes self-register, CLI just looks them up by name.
 */

import type { Recipe } from './recipe.types.js';

const recipes = new Map<string, Recipe>();

/** Register a recipe. Throws on duplicate name. */
export function registerRecipe(recipe: Recipe): void {
  if (recipes.has(recipe.name)) {
    throw new Error(`Recipe "${recipe.name}" already registered`);
  }
  recipes.set(recipe.name, recipe);
}

/** Get a recipe by name, or undefined if not found. */
export function getRecipe(name: string): Recipe | undefined {
  return recipes.get(name);
}

/** List all registered recipe names with descriptions. */
export function listRecipes(): Array<{ name: string; description: string }> {
  return [...recipes.values()].map((r) => ({
    name: r.name,
    description: r.description,
  }));
}

/** Clear all registered recipes (for testing). */
export function clearRecipes(): void {
  recipes.clear();
}
