/**
 * CLI command: flusk g:tui-component <name>
 * Generates a TUI Ink component
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateTuiComponent } from '../generators/tui/index.js';

export const generateTuiComponentCommand = new Command('g:tui-component')
  .description('Generate a TUI Ink component')
  .argument('<name>', 'Component name in kebab-case')
  .action(async (name: string) => {
    console.log(chalk.blue(`\n🎨 Generating TUI component: ${name}\n`));
    const path = await generateTuiComponent(name);
    console.log(chalk.green(`  ✅ ${path}\n`));
  });
