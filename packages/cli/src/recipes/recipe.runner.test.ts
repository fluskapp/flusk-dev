/**
 * Unit tests for the recipe runner — step execution, dry-run, rollback.
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { runRecipe } from './recipe.runner.js';
import { createContext } from './recipe.helpers.js';
import type { Recipe, RecipeStep, RecipeContext } from './recipe.types.js';

function makeStep(name: string, files: string[] = []): RecipeStep {
  return {
    name,
    description: `Test step ${name}`,
    async run() {
      return { files: files.map((f) => ({ path: f, action: 'created' as const })) };
    },
  };
}

function failStep(name: string): RecipeStep {
  return {
    name,
    description: `Failing step`,
    async run() { throw new Error(`${name} failed`); },
  };
}

describe('Recipe Runner', () => {
  test('runs steps sequentially and collects files', async () => {
    const recipe: Recipe = {
      name: 'test',
      description: 'test recipe',
      steps: [makeStep('a', ['/tmp/a.ts']), makeStep('b', ['/tmp/b.ts'])],
    };
    const ctx = createContext('/tmp', {});
    const result = await runRecipe(recipe, ctx);
    assert.strictEqual(result.stepLogs.length, 2);
    assert.strictEqual(result.files.length, 2);
    assert.strictEqual(result.dryRun, false);
  });

  test('dry-run mode sets flag', async () => {
    const recipe: Recipe = {
      name: 'test',
      description: 'test',
      steps: [makeStep('a')],
    };
    const ctx = createContext('/tmp', {}, true);
    const result = await runRecipe(recipe, ctx);
    assert.strictEqual(result.dryRun, true);
  });

  test('skips steps when condition returns false', async () => {
    const skipped: RecipeStep = {
      name: 'skip-me',
      description: 'skipped',
      when: () => false,
      async run() { return { files: [] }; },
    };
    const recipe: Recipe = {
      name: 'test',
      description: 'test',
      steps: [skipped],
    };
    const ctx = createContext('/tmp', {});
    const result = await runRecipe(recipe, ctx);
    assert.strictEqual(result.stepLogs[0].skipped, true);
  });

  test('throws on step failure and rolls back', async () => {
    const recipe: Recipe = {
      name: 'test',
      description: 'test',
      steps: [makeStep('ok', []), failStep('bad')],
    };
    const ctx = createContext('/tmp', {});
    await assert.rejects(() => runRecipe(recipe, ctx), /bad failed/);
  });

  test('runs before/after hooks', async () => {
    let hookOrder: string[] = [];
    const recipe: Recipe = {
      name: 'test',
      description: 'test',
      steps: [makeStep('mid')],
      hooks: {
        async before() { hookOrder.push('before'); },
        async after() { hookOrder.push('after'); },
      },
    };
    const ctx = createContext('/tmp', {});
    await runRecipe(recipe, ctx);
    assert.deepStrictEqual(hookOrder, ['before', 'after']);
  });

  test('merges shared data between steps', async () => {
    const step1: RecipeStep = {
      name: 's1',
      description: 'sets data',
      async run() { return { files: [], shared: { foo: 'bar' } }; },
    };
    const step2: RecipeStep = {
      name: 's2',
      description: 'reads data',
      async run(ctx) {
        assert.strictEqual(ctx.shared['foo'], 'bar');
        return { files: [] };
      },
    };
    const recipe: Recipe = { name: 'test', description: 'test', steps: [step1, step2] };
    await runRecipe(recipe, createContext('/tmp', {}));
  });
});
