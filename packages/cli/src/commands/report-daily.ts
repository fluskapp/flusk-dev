/**
 * CLI command: flusk report daily — daily cost digest.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createSqliteStorage } from '@flusk/resources';
import { dailyReport } from '@flusk/business-logic';

export const reportDailyCommand = new Command('daily')
  .description('Daily cost digest (per model, per provider, total)')
  .option('-d, --date <date>', 'Date (YYYY-MM-DD)', () => {
    return new Date().toISOString().slice(0, 10);
  })
  .option('-f, --format <fmt>', 'Output format: text|json|markdown', 'text')
  .action((opts: { date: string; format: string }) => {
    const storage = createSqliteStorage();
    const calls = storage.llmCalls.list(100_000, 0);
    const date = opts.date || new Date().toISOString().slice(0, 10);
    const filtered = calls.filter(
      (c: Record<string, unknown>) => String(c.createdAt ?? '').startsWith(date),
    );

    const result = dailyReport({ calls: filtered as never[], date });

    if (opts.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold(`📊 Daily Report: ${date}`));
    console.log(`Total: ${chalk.green('$' + result.totalCost.toFixed(4))} across ${result.totalCalls} calls\n`);

    for (const m of result.byModel) {
      console.log(`  ${chalk.cyan(m.model)} (${m.provider}): $${m.cost.toFixed(4)} × ${m.count}`);
    }
  });
