import { Command } from 'commander';
import chalk from 'chalk';
import { generateEntrypoint } from '../generators/entrypoint.generator.js';

export const generateEntrypointCommand = new Command('g:entrypoint')
  .description('Generate docker-entrypoint.sh script')
  .option('--no-migrations', 'Skip migration step')
  .option('--server-cmd <cmd>', 'Server start command')
  .action(async (options) => {
    console.log(chalk.blue('\n🚀 Generating docker-entrypoint.sh...\n'));
    try {
      const result = await generateEntrypoint({
        runMigrations: options.migrations !== false,
        serverCmd: options.serverCmd,
      });
      console.log(chalk.green(`✅ ${result.path}`));
      console.log(chalk.green('\n✨ docker-entrypoint.sh generated!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
