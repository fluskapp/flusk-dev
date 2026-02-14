/**
 * CLI command: flusk generate entity --from <yaml>
 *
 * WHY: This is the primary user-facing command for schema-first
 * code generation. One YAML → TypeBox schema + migration + types.
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import chalk from 'chalk';
import { runEntityPipeline } from '../schema/generate-entity-pipeline.js';

export const generateEntityFromYamlCommand = new Command('generate:entity')
  .description('Generate entity files from YAML schema')
  .requiredOption('--from <yaml>', 'Path to entity YAML file')
  .action(async (options: { from: string }) => {
    const yamlPath = resolve(process.cwd(), options.from);
    const projectRoot = process.cwd();

    console.log(chalk.blue(`\n📋 Generating entity from ${options.from}...\n`));

    try {
      const result = runEntityPipeline(yamlPath, projectRoot);

      for (const file of result.files) {
        const icon = file.action === 'created' ? '✅' : '🔄';
        console.log(chalk.green(`${icon} ${file.path}`));
      }

      console.log(chalk.green(
        `\n✨ Generated ${result.files.length} files for ${result.entityName}\n`,
      ));
    } catch (error) {
      console.error(chalk.red('\n❌ Generation failed:'));
      console.error(chalk.red(`   ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
