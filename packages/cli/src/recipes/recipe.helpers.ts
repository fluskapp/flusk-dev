/** @generated —
 * Shared helpers for recipe step implementations.
 *
 * WHY: Many recipe steps need to write files and track them.
 * This avoids duplicating fs logic across every step function.
 */

import { resolve } from 'node:path';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import type { RecipeContext, StepResult } from './recipe.types.js';

/** Write a file and return a StepResult entry. Skips on dry-run. */
export function writeRecipeFile(
  ctx: RecipeContext,
  dir: string,
  filename: string,
  content: string,
): { path: string; action: 'created' | 'updated' } {
  const fullPath = resolve(dir, filename);
  const action = existsSync(fullPath) ? 'updated' : 'created';

  if (!ctx.dryRun) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
  }

  return { path: fullPath, action };
}

/** Create an empty StepResult */
export function emptyResult(): StepResult {
  return { files: [] };
}

/** Create a RecipeContext with defaults */
export function createContext(
  projectRoot: string,
  options: Record<string, string | boolean>,
  dryRun = false,
): RecipeContext {
  return {
    projectRoot,
    options,
    generatedFiles: [],
    shared: {},
    dryRun,
  };
}
