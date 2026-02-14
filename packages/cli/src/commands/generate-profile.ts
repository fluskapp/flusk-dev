/** @generated —
 * CLI command: flusk g:profile
 * Scaffolds performance profiling configuration
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateProfile } from '../generators/profile.generator.js';

export const generateProfileCommand = new Command('g:profile')
  .description('Scaffold performance profiling config and scripts')
  .option('--dry-run', 'Preview files without writing')
  .action(async (options) => {
    console.log(chalk.blue('\n🔥 Generating profiling config\n'));

    if (options.dryRun) {
      const files = ['profile.config.ts', 'scripts/profile.sh'];
      for (const f of files) {
        console.log(chalk.cyan(`  📄 ${f}`));
      }
      return;
    }

    try {
      const result = await generateProfile();
      for (const f of result.files) {
        console.log(chalk.green(`  ✅ ${f.path}`));
      }
      console.log(chalk.green('\n✨ Profiling scaffolded!\n'));
      console.log(
        chalk.dim('  Next: run `flusk profile run` to start profiling'),
      );
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed: ${error}`));
      process.exit(1);
    }
  });
