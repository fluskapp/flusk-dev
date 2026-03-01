/**
 * CLI command: flusk report waste — duplicate prompts and over-provisioned models.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createSqliteStorage } from '@flusk/resources';
import { wasteReport } from '@flusk/business-logic';

export const reportWasteCommand = new Command('waste')
  .description('Waste report — duplicates, unused tokens, over-provisioned models')
  .option('-f, --format <fmt>', 'Output format: text|json', 'text')
  .action((opts: { format: string }) => {
    const storage = createSqliteStorage();
    const calls = storage.llmCalls.list(100_000, 0);

    const result = wasteReport({ calls: calls as never[] });

    if (opts.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold('♻️  Waste Report'));
    console.log(`Duplicate cost: ${chalk.red('$' + result.duplicateCostTotal.toFixed(4))}`);
    console.log(`Duplicate groups: ${result.duplicatePrompts.length}\n`);

    for (const d of result.duplicatePrompts.slice(0, 10)) {
      console.log(`  ${chalk.dim(d.promptHash.slice(0, 8))} × ${d.count} = $${d.wastedCost.toFixed(4)} (${d.model})`);
    }

    if (result.overProvisioned.length > 0) {
      console.log(chalk.bold('\n🔧 Over-provisioned models:'));
      for (const o of result.overProvisioned) {
        console.log(`  ${chalk.yellow(o.model)}: ${o.suggestion}`);
      }
    }
  });
