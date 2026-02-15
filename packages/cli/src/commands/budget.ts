/**
 * CLI command: flusk budget — show budget status with progress bars
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createSqliteStorage } from '@flusk/resources';
import { budget as budgetLogic } from '@flusk/business-logic';
import { loadConfig } from '../config/index.js';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'budget' });

export const budgetCommand = new Command('budget')
  .description('Show budget status and alerts')
  .action(async () => {
    const config = await loadConfig();
    const storage = createSqliteStorage(config.storage?.path);

    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const dailyCost = storage.llmCalls.sumCostSince(dayStart);
    const monthlyCost = storage.llmCalls.sumCostSince(monthStart);
    const totalCalls = storage.llmCalls.list(100_000, 0).length;
    const duplicateCalls = storage.llmCalls.countDuplicates();

    const status = budgetLogic.checkBudget(config.budget, {
      dailyCost, monthlyCost, totalCalls, duplicateCalls,
    });

    console.log(chalk.bold.cyan('\n📊 Budget Status\n'));
    printBar('Daily', status.daily);
    printBar('Monthly', status.monthly);

    if (status.alerts.length > 0) {
      console.log(chalk.yellow('\n⚠️  Alerts:'));
      for (const alert of status.alerts) {
        console.log(chalk.yellow(`  - ${alert}`));
      }
    } else {
      console.log(chalk.green('\n✅ All budgets within limits'));
    }
    console.log('');
    log.info('Budget check complete');
  });

function printBar(label: string, period: budgetLogic.BudgetPeriod): void {
  if (period.limit === Infinity) {
    console.log(chalk.dim(`${label.padEnd(8)} No limit configured`));
    return;
  }
  const width = 10;
  const filled = Math.round((period.percentage / 100) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = period.percentage >= 100 ? chalk.red
    : period.percentage >= 80 ? chalk.yellow
    : chalk.green;
  const pct = `${period.percentage.toFixed(0)}%`;
  console.log(`${label.padEnd(8)} ${color(bar)} $${period.used.toFixed(2)} / $${period.limit.toFixed(2)} (${pct})`);
}
