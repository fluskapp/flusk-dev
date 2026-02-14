/** @generated —
 * CLI command: flusk package <name>
 * Creates a new package in the monorepo
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generatePackage } from '../generators/package.generator.js';

export const generatePackageCommand = new Command('package')
  .description('Create a new package in the monorepo')
  .argument('<name>', 'Package name in kebab-case (e.g., analytics)')
  .option('--dry-run', 'Show what would be generated without writing files')
  .action(async (name: string, options) => {
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
      console.error(chalk.red('Error: Name must be kebab-case'));
      process.exit(1);
    }

    console.log(chalk.blue(`\n📦 Creating package: @flusk/${name}\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('  (dry run — no files written)\n'));
      const files = [
        `packages/${name}/package.json`,
        `packages/${name}/tsconfig.json`,
        `packages/${name}/src/index.ts`,
        `packages/${name}/src/config.ts`,
        `packages/${name}/README.md`,
      ];
      for (const f of files) {
        console.log(chalk.cyan(`  📄 ${f}`));
      }
      return;
    }

    try {
      const result = await generatePackage(name);
      for (const f of result.files) {
        console.log(chalk.green(`  ✅ ${f}`));
      }
      console.log(chalk.green('\n✨ Package created!\n'));
      console.log(chalk.dim(`  Run: pnpm install`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed: ${error}`));
      process.exit(1);
    }
  });
