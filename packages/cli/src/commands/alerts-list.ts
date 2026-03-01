/**
 * CLI command: flusk alerts list — show configured alert rules.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface AlertRule {
  id: string;
  type: string;
  name: string;
  threshold: number;
  channel: string;
  enabled: boolean;
}

const CONFIG_PATH = resolve(
  process.env['HOME'] ?? '.',
  '.flusk',
  'alerts.json',
);

export const alertsListCommand = new Command('list')
  .description('List configured alert rules')
  .action(() => {
    if (!existsSync(CONFIG_PATH)) {
      console.log(chalk.dim('No alert rules configured. Run: flusk alerts setup'));
      return;
    }

    const rules = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as AlertRule[];
    if (rules.length === 0) {
      console.log(chalk.dim('No alert rules configured.'));
      return;
    }

    console.log(chalk.bold(`📋 Alert Rules (${rules.length}):\n`));
    for (const r of rules) {
      const status = r.enabled ? chalk.green('●') : chalk.red('○');
      console.log(`  ${status} ${r.name} [${r.type}] threshold=${r.threshold} → ${r.channel}`);
    }
  });
