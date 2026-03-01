/**
 * CLI command: flusk report anomaly — detect cost spikes and drops.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createSqliteStorage } from '@flusk/resources';
import { anomalyReport } from '@flusk/business-logic';

export const reportAnomalyCommand = new Command('anomaly')
  .description('Anomaly detection — cost spikes and drops')
  .option('-t, --threshold <n>', 'Deviation threshold (default: 2.0)', '2.0')
  .option('-f, --format <fmt>', 'Output format: text|json', 'text')
  .action((opts: { threshold: string; format: string }) => {
    const storage = createSqliteStorage();
    const calls = storage.llmCalls.list(100_000, 0);
    const threshold = parseFloat(opts.threshold);

    const result = anomalyReport({ calls: calls as never[], threshold });

    if (opts.format === 'json') {
      console.log(JSON.stringify(result, null, 2));
      return;
    }

    console.log(chalk.bold('🔍 Anomaly Report'));
    console.log(`Models analyzed: ${result.totalModelsAnalyzed}\n`);

    if (result.anomalies.length === 0) {
      console.log(chalk.green('✅ No anomalies detected'));
      return;
    }

    for (const a of result.anomalies) {
      const icon = a.type === 'spike' ? '📈' : '📉';
      const color = a.type === 'spike' ? chalk.red : chalk.blue;
      console.log(`  ${icon} ${color(a.model)}: ${a.type} (${(a.deviation * 100).toFixed(0)}% deviation)`);
    }
  });
