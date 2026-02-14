import { Command } from 'commander';
import chalk from 'chalk';
import { generateSqliteRepo } from '../generators/sqlite-repo.generator.js';

export const generateSqliteRepoCommand = new Command('g:sqlite-repo')
  .description('Generate a SQLite repository (node:sqlite)')
  .argument('<name>', 'Entity name in kebab-case (e.g., llm-call)')
  .action(async (name: string) => {
    console.log(chalk.blue(`\n🗄️  Generating SQLite repo: ${name}...\n`));

    try {
      const results = await generateSqliteRepo({ name });

      for (const result of results) {
        console.log(chalk.green(`✅ ${result.path}`));
      }

      console.log(chalk.green('\n✨ SQLite repository generated!\n'));
      console.log(chalk.yellow('⚠️  Remember to implement row-to-entity and create.\n'));
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to generate SQLite repo:'));
      console.error(chalk.red(`   ${(error as Error).message}\n`));
      process.exit(1);
    }
  });
