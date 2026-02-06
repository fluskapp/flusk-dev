import { Command } from 'commander';
import { resolve, basename } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import chalk from 'chalk';
import { generateTypes } from '../generators/types.generator.js';
import { generateResources } from '../generators/resources.generator.js';
import { generateBusinessLogic } from '../generators/business-logic.generator.js';
import { generateExecution } from '../generators/execution.generator.js';

export const generateCommand = new Command('g')
  .aliases(['generate'])
  .description('Generate code from entity schemas')
  .argument('[entity-file]', 'Entity file to generate from (e.g., llm-call.entity.ts)')
  .option('--types-only', 'Generate only types package')
  .option('--all', 'Generate from all entities')
  .action(async (entityFile: string | undefined, options) => {
    const entitiesDir = resolve(process.cwd(), 'packages/entities/src');

    if (!existsSync(entitiesDir)) {
      console.error(chalk.red('Error: packages/entities/src directory not found'));
      console.error(chalk.yellow('Run this command from the project root'));
      process.exit(1);
    }

    const entityFiles: string[] = [];

    if (options.all) {
      // Generate from all entity files
      const allFiles = readdirSync(entitiesDir)
        .filter(f => f.endsWith('.entity.ts') && f !== 'base.entity.ts');
      entityFiles.push(...allFiles);
    } else if (entityFile) {
      // Generate from specific entity file
      const fileName = entityFile.endsWith('.entity.ts') ? entityFile : `${entityFile}.entity.ts`;
      if (!existsSync(resolve(entitiesDir, fileName))) {
        console.error(chalk.red(`Error: Entity file not found: ${fileName}`));
        process.exit(1);
      }
      entityFiles.push(fileName);
    } else {
      console.error(chalk.red('Error: Provide an entity file or use --all'));
      console.error(chalk.yellow('Example: flusk g llm-call.entity.ts'));
      process.exit(1);
    }

    console.log(chalk.blue(`\n🔧 Generating code from ${entityFiles.length} entity file(s)...\n`));

    for (const file of entityFiles) {
      const entityPath = resolve(entitiesDir, file);
      const entityName = basename(file, '.entity.ts');

      console.log(chalk.cyan(`\n📦 Processing: ${file}`));

      try {
        // Generate types
        const typesResult = await generateTypes(entityPath, entityName);
        console.log(chalk.green(`  ✅ ${typesResult.path}`));

        if (options.typesOnly) {
          continue;
        }

        // Generate resources (repositories + migrations)
        const resourceResults = await generateResources(entityPath, entityName);
        for (const result of resourceResults) {
          console.log(chalk.green(`  ✅ ${result.path}`));
        }

        // Generate business logic stubs
        const logicResults = await generateBusinessLogic(entityPath, entityName);
        for (const result of logicResults) {
          console.log(chalk.green(`  ✅ ${result.path}`));
        }

        // Generate execution layer (routes, plugins, hooks)
        const executionResults = await generateExecution(entityPath, entityName);
        for (const result of executionResults) {
          console.log(chalk.green(`  ✅ ${result.path}`));
        }
      } catch (error) {
        console.error(chalk.red(`  ❌ Failed to generate from ${file}:`), error);
        process.exit(1);
      }
    }

    console.log(chalk.green('\n✨ Code generation complete!\n'));
  });
