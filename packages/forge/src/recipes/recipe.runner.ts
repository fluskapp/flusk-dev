/**
 * Recipe execution engine — runs steps sequentially with logging.
 *
 * WHY: Centralizes step orchestration, timing, dry-run, and rollback
 * so individual recipes only define WHAT to generate, not HOW to run.
 */

import { unlinkSync, existsSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import type {
  Recipe, RecipeContext, RecipeResult, StepLog,
} from './recipe.types.js';

const logger = createLogger({ name: 'recipe:runner' });

/**
 * Execute a recipe: run hooks, steps in order, collect results.
 * Rolls back generated files on failure.
 */
export async function runRecipe(
  recipe: Recipe,
  ctx: RecipeContext,
): Promise<RecipeResult> {
  const start = performance.now();
  const stepLogs: StepLog[] = [];
  logger.info({ recipe: recipe.name, dryRun: ctx.dryRun }, 'Starting recipe');

  if (recipe.hooks?.before) await recipe.hooks.before(ctx);

  try {
    for (const step of recipe.steps) {
      const log = await executeStep(step, ctx);
      stepLogs.push(log);
    }
  } catch (error) {
    await rollback(ctx.generatedFiles);
    throw error;
  }

  if (recipe.hooks?.after) await recipe.hooks.after(ctx);

  const totalMs = Math.round(performance.now() - start);
  logger.info({ recipe: recipe.name, totalMs, files: ctx.generatedFiles.length },
    'Recipe complete');

  return {
    recipeName: recipe.name,
    files: ctx.generatedFiles.map((p) => ({ path: p, action: 'created' })),
    stepLogs,
    totalMs,
    dryRun: ctx.dryRun,
  };
}

/**
 * Execute one step — skip if condition fails, log timing.
 */
async function executeStep(
  step: Recipe['steps'][number],
  ctx: RecipeContext,
): Promise<StepLog> {
  if (step.when && !step.when(ctx)) {
    logger.info({ step: step.name }, 'Step skipped (condition)');
    return { stepName: step.name, durationMs: 0, fileCount: 0, skipped: true };
  }

  const stepStart = performance.now();
  logger.info({ step: step.name }, 'Step started');

  const result = await step.run(ctx);
  for (const f of result.files) ctx.generatedFiles.push(f.path);
  if (result.shared) Object.assign(ctx.shared, result.shared);

  const durationMs = Math.round(performance.now() - stepStart);
  logger.info({ step: step.name, durationMs, files: result.files.length },
    'Step complete');
  return { stepName: step.name, durationMs, fileCount: result.files.length, skipped: false };
}

/**
 * Delete generated files on failure — best-effort cleanup.
 */
async function rollback(files: string[]): Promise<void> {
  logger.warn({ fileCount: files.length }, 'Rolling back generated files');
  for (const filePath of files) {
    try {
      if (existsSync(filePath)) unlinkSync(filePath);
    } catch { /* best effort */ }
  }
}
