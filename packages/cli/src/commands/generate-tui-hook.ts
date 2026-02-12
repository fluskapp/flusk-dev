/**
 * CLI command: flusk g:tui-hook <name>
 * Generates a TUI React hook
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateTuiHook } from '../generators/tui/index.js';

export const generateTuiHookCommand = new Command('g:tui-hook')
  .description('Generate a TUI React hook')
  .argument('<name>', 'Hook name in kebab-case')
  .action(async (name: string) => {
    console.log(chalk.blue(`\n🪝 Generating TUI hook: ${name}\n`));
    const path = await generateTuiHook(name);
    console.log(chalk.green(`  ✅ ${path}\n`));
  });
