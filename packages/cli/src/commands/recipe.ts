/**
 * CLI command: flusk recipe <name> [options]
 *
 * WHY: Single entry point for running any recipe. Supports
 * list, dry-run, and per-recipe options via passthrough flags.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { registerDefaultRecipes } from '../recipes/register-defaults.js';
import { getRecipe, listRecipes } from '../recipes/recipe.registry.js';
import { runRecipe } from '../recipes/recipe.runner.js';
import { createContext } from '../recipes/recipe.helpers.js';

export const recipeCommand = new Command('recipe')
  .description('Run a code generation recipe')
  .argument('[name]', 'Recipe name (or "list" to show all)')
  .option('--from <path>', 'YAML file path (for full-entity)')
  .option('--name <name>', 'Name for generated artifact')
  .option('--description <desc>', 'Description text')
  .option('--package <pkg>', 'Target package name')
  .option('--with-config', 'Include config block')
  .option('--with-decorator', 'Include decorator')
  .option('--dry-run', 'Preview without writing files', false)
  .action(async (name: string | undefined, opts: Record<string, unknown>) => {
    registerDefaultRecipes();

    if (!name || name === 'list') {
      printRecipeList();
      return;
    }

    const recipe = getRecipe(name);
    if (!recipe) {
      console.error(chalk.red(`\n❌ Unknown recipe: ${name}`));
      console.error(chalk.yellow('Run `flusk recipe list` to see available recipes\n'));
      process.exit(1);
    }

    const ctx = createContext(process.cwd(), opts as Record<string, string | boolean>,
      opts['dryRun'] === true);
    const label = ctx.dryRun ? '(dry run) ' : '';
    console.log(chalk.blue(`\n🍳 ${label}Running recipe: ${name}\n`));

    try {
      const result = await runRecipe(recipe, ctx);
      printResult(result);
    } catch (error) {
      console.error(chalk.red(`\n❌ Recipe failed: ${(error as Error).message}\n`));
      process.exit(1);
    }
  });

function printRecipeList(): void {
  console.log(chalk.blue('\n📋 Available recipes:\n'));
  for (const r of listRecipes()) {
    console.log(`  ${chalk.green(r.name.padEnd(20))} ${r.description}`);
  }
  console.log('');
}

function printResult(result: import('../recipes/recipe.types.js').RecipeResult): void {
  for (const step of result.stepLogs) {
    const icon = step.skipped ? '⏭️' : '✅';
    console.log(`${icon} ${step.stepName} (${step.durationMs}ms, ${step.fileCount} files)`);
  }
  console.log(chalk.green(
    `\n✨ Recipe "${result.recipeName}" complete — ${result.files.length} files in ${result.totalMs}ms\n`,
  ));
}
