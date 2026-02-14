/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateDockerfile } from '../generators/dockerfile.generator.js';

export const generateDockerfileCommand = new Command('g:dockerfile')
  .description('Generate a production Dockerfile')
  .option('--port <port>', 'Application port', '3000')
  .option('--entrypoint <path>', 'JS entrypoint path')
  .action(async (options) => {
    console.log(chalk.blue('\n🐳 Generating Dockerfile...\n'));
    try {
      const result = await generateDockerfile({
        port: parseInt(options.port, 10),
        entrypoint: options.entrypoint,
      });
      console.log(chalk.green(`✅ ${result.path}`));
      console.log(chalk.green('\n✨ Dockerfile generated!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
