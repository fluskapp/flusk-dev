/** @generated —
 * CLI command: flusk g:tui-app
 * Generates the root TUI app with navigation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateTuiApp } from '../generators/tui/index.js';

export const generateTuiAppCommand = new Command('g:tui-app')
  .description('Generate the root TUI app with navigation')
  .action(async () => {
    console.log(chalk.blue('\n🖥️  Generating TUI app...\n'));
    const path = await generateTuiApp();
    console.log(chalk.green(`  ✅ ${path}\n`));
  });
