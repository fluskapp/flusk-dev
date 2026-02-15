/**
 * Unit tests for recipe registry.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  registerRecipe, getRecipe, listRecipes, clearRecipes,
} from './recipe.registry.js';
import type { Recipe } from './recipe.types.js';

const fakeRecipe: Recipe = {
  name: 'test-recipe',
  description: 'A test recipe',
  steps: [],
};

describe('Recipe Registry', () => {
  beforeEach(() => clearRecipes());

  test('registers and retrieves a recipe', () => {
    registerRecipe(fakeRecipe);
    assert.strictEqual(getRecipe('test-recipe')?.name, 'test-recipe');
  });

  test('returns undefined for unknown recipe', () => {
    assert.strictEqual(getRecipe('nope'), undefined);
  });

  test('throws on duplicate registration', () => {
    registerRecipe(fakeRecipe);
    assert.throws(() => registerRecipe(fakeRecipe), /already registered/);
  });

  test('lists all registered recipes', () => {
    registerRecipe(fakeRecipe);
    const list = listRecipes();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].name, 'test-recipe');
  });

  test('clearRecipes empties the registry', () => {
    registerRecipe(fakeRecipe);
    clearRecipes();
    assert.strictEqual(getRecipe('test-recipe'), undefined);
  });
});
