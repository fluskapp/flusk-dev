/**
 * CLI command: flusk alerts test — fire a test alert.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { alerts } from '@flusk/business-logic';

interface AlertRule {
  id: string;
  type: 'budget' | 'latency' | 'error-rate';
  name: string;
  threshold: number;
  channel: 'webhook' | 'stdout' | 'file';
  channelConfig: Record<string, unknown>;
  enabled: boolean;
}

const CONFIG_PATH = resolve(
  process.env['HOME'] ?? '.',
  '.flusk',
  'alerts.json',
);

export const alertsTestCommand = new Command('test')
  .description('Fire a test alert for each configured rule')
  .action(async () => {
    if (!existsSync(CONFIG_PATH)) {
      console.log(chalk.red('No alert rules configured.'));
      return;
    }

    const rules = JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as AlertRule[];
    console.log(chalk.bold('🧪 Testing alerts...\n'));

    for (const rule of rules) {
      const testEvent: alerts.AlertEvent = {
        ruleId: rule.id,
        type: rule.type,
        severity: 'info',
        message: `[TEST] ${rule.name}: test alert`,
        value: rule.threshold + 1,
        threshold: rule.threshold,
        timestamp: new Date().toISOString(),
      };

      const ok = await alerts.dispatchAlert(testEvent, rule);
      const status = ok ? chalk.green('✅') : chalk.red('❌');
      console.log(`  ${status} ${rule.name} → ${rule.channel}`);
    }
  });
