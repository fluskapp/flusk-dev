/** @generated —
 * CLI command: flusk generate feature <name>
 * Scaffolds a complete feature across all packages
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateFeature } from '../generators/feature.generator.js';

export const generateFeatureCommand = new Command('feature')
  .description('Scaffold a complete feature across all packages')
  .argument('<name>', 'Feature name in kebab-case (e.g., billing-plan)')
  .option('--dry-run', 'Show what would be generated without writing files')
  .option('--skip-entity', 'Skip entity/types generation')
  .option('--skip-routes', 'Skip routes/plugin/hooks generation')
  .option('--skip-tests', 'Skip test file generation')
  .option('--skip-migration', 'Skip SQL migration generation')
  .action(async (name: string, options) => {
    // Validate name format
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
      console.error(chalk.red('Error: Name must be kebab-case (e.g., billing-plan)'));
      process.exit(1);
    }

    console.log(chalk.blue(`\n🚀 Generating feature: ${name}\n`));

    if (options.dryRun) {
      console.log(chalk.yellow('  (dry run — no files written)\n'));
      const layers = [
        `packages/entities/src/${name}.entity.ts`,
        `packages/types/src/${name}.types.ts`,
        `packages/business-logic/src/${name}/validate-${name}.function.ts`,
        `packages/business-logic/src/${name}/index.ts`,
        `packages/resources/src/repositories/${name}.repository.ts`,
        `packages/resources/src/migrations/XXX_${name.replace(/-/g, '_')}s.sql`,
        `packages/execution/src/routes/${name}.routes.ts`,
        `packages/execution/src/plugins/${name}.plugin.ts`,
        `packages/execution/src/hooks/${name}.hooks.ts`,
        `packages/business-logic/src/${name}/validate-${name}.test.ts`,
      ];
      for (const f of layers) {
        console.log(chalk.cyan(`  📄 ${f}`));
      }
      console.log(chalk.yellow('\n  + barrel export updates + app.ts registration'));
      return;
    }

    try {
      const result = await generateFeature(name, {
        skipEntity: options.skipEntity,
        skipRoutes: options.skipRoutes,
        skipTests: options.skipTests,
        skipMigration: options.skipMigration,
      });

      for (const f of result.files) {
        const icon = f.action === 'created' ? '✅' : '📝';
        console.log(chalk.green(`  ${icon} ${f.path}`));
      }

      console.log(chalk.green('\n✨ Feature scaffolded successfully!\n'));
      console.log(chalk.dim('  Next steps:'));
      console.log(chalk.dim(`  1. Edit packages/entities/src/${name}.entity.ts — add your fields`));
      console.log(chalk.dim(`  2. Run: flusk g ${name}.entity.ts — regenerate types/repo/routes`));
      console.log(chalk.dim(`  3. Implement business logic & tests`));
      console.log(chalk.dim(`  4. Run: pnpm test\n`));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed to generate feature: ${error}`));
      process.exit(1);
    }
  });
