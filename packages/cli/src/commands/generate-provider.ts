/**
 * CLI command: flusk g:provider <name>
 * Scaffolds LLM provider integration (pricing, span config, test)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateProvider } from '../generators/provider.generator.js';

export const generateProviderCommand = new Command('g:provider')
  .description('Scaffold an LLM provider integration')
  .argument('<name>', 'Provider name in kebab-case (e.g., bedrock)')
  .option('--dry-run', 'Preview files without writing')
  .action(async (name: string, options) => {
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) {
      console.error(chalk.red('Error: Name must be kebab-case'));
      process.exit(1);
    }

    console.log(chalk.blue(`\n🔌 Generating provider: ${name}\n`));

    if (options.dryRun) {
      const files = [
        `packages/business-logic/src/llm-call/providers/${name}.pricing.ts`,
        `packages/business-logic/src/llm-call/providers/${name}.span-config.ts`,
        `packages/business-logic/src/llm-call/providers/${name}.test.ts`,
      ];
      for (const f of files) {
        console.log(chalk.cyan(`  📄 ${f}`));
      }
      return;
    }

    try {
      const result = await generateProvider(name);
      for (const f of result.files) {
        console.log(chalk.green(`  ✅ ${f.path}`));
      }
      console.log(chalk.green('\n✨ Provider scaffolded!\n'));
      console.log(chalk.dim('  Next: customize pricing & span config'));
    } catch (error) {
      console.error(chalk.red(`\n❌ Failed: ${error}`));
      process.exit(1);
    }
  });
