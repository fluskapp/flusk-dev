/** @generated —
 * CLI command: flusk g:tui-screen <name>
 * Generates a TUI Ink screen component
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateTuiScreen } from '../generators/tui/index.js';

export const generateTuiScreenCommand = new Command('g:tui-screen')
  .description('Generate a TUI Ink screen')
  .argument('<name>', 'Screen name in kebab-case')
  .action(async (name: string) => {
    console.log(chalk.blue(`\n📺 Generating TUI screen: ${name}\n`));
    const path = await generateTuiScreen(name);
    console.log(chalk.green(`  ✅ ${path}\n`));
  });
