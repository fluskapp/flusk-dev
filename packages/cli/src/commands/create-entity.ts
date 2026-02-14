/** @generated —
 * Create entity command - interactive entity schema creation
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createEntityInteractive } from '../interactive/entity.prompts.js';
import { generateEntitySchema } from '../generators/entity-schema.generator.js';
import { toKebabCase } from '../generators/utils.js';

export const createEntityCommand = new Command('create:entity')
  .description('Create a new entity schema interactively')
  .action(async () => {
    // Check if running from project root
    const entitiesDir = resolve(process.cwd(), 'packages/entities/src');

    if (!existsSync(entitiesDir)) {
      console.error(chalk.red('\n❌ Error: packages/entities/src directory not found'));
      console.error(chalk.yellow('   Run this command from the project root\n'));
      process.exit(1);
    }

    try {
      // Step 1: Interactive prompts
      const definition = await createEntityInteractive();

      // Step 2: Generate entity schema file
      const spinner = ora(chalk.blue('Generating entity schema...')).start();

      const result = await generateEntitySchema(definition);

      spinner.succeed(chalk.green('Entity schema generated!'));

      // Step 3: Show success message with next steps
      const kebabName = toKebabCase(definition.name);
      const fileName = `${kebabName}.entity.ts`;

      console.log(chalk.green(`\n✅ Created ${result.path}\n`));

      console.log(chalk.yellow('Next steps:'));
      console.log(chalk.cyan(`  1. Review the generated entity file`));
      console.log(chalk.cyan(`  2. Run: ${chalk.bold(`flusk g ${fileName}`)} to generate code`));
      console.log(chalk.cyan(`  3. Run: ${chalk.bold('flusk migrate')} to apply database changes\n`));

    } catch (error) {
      console.error(chalk.red('\n❌ Entity creation failed:'), error);
      process.exit(1);
    }
  });
