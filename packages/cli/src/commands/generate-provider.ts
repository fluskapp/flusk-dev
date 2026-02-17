/**
 * CLI command: flusk g:provider [name] --from <yaml>
 * Scaffolds a full LLM provider integration from YAML schema.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateProvider } from '@flusk/forge';

export const generateProviderCommand = new Command('g:provider')
  .description('Scaffold an LLM provider integration')
  .argument('[name]', 'Provider name in kebab-case (e.g., anthropic)')
  .option('--from <path>', 'Provider YAML schema file')
  .option('--dry-run', 'Preview files without writing')
  .action(async (name: string | undefined, options) => {
    const source = options.from || name;
    if (!source) {
      console.error(chalk.red('Error: Provide a name or --from <yaml>'));
      process.exit(1);
    }

    const isYaml = source.endsWith('.yaml') || source.endsWith('.yml');
    const label = isYaml ? `from ${source}` : source;
    console.log(chalk.blue(`\n🔌 Generating provider: ${label}\n`));

    if (options.dryRun) {
      console.log(chalk.cyan('  (dry-run mode — no files written)'));
      return;
    }

    try {
      const result = await generateProvider(source);
      for (const f of result.files) {
        const icon = f.action === 'updated' ? '🔄' : '✅';
        console.log(chalk.green(`  ${icon} ${f.path}`));
      }
      console.log(chalk.green('\n✨ Provider scaffolded!\n'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed: ${error}`));
      process.exit(1);
    }
  });
