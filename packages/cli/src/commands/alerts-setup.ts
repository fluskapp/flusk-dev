/**
 * CLI command: flusk alerts setup — configure alert rules.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

type AlertType = 'budget' | 'latency' | 'error-rate';
type AlertChannel = 'webhook' | 'stdout' | 'file';

interface AlertRule {
  id: string;
  type: AlertType;
  name: string;
  threshold: number;
  channel: AlertChannel;
  channelConfig: Record<string, unknown>;
  enabled: boolean;
}

const CONFIG_PATH = resolve(
  process.env['HOME'] ?? '.',
  '.flusk',
  'alerts.json',
);

export const alertsSetupCommand = new Command('setup')
  .description('Configure a new alert rule')
  .requiredOption('--type <type>', 'Alert type: budget|latency|error-rate')
  .requiredOption('--threshold <n>', 'Threshold value')
  .option('--channel <ch>', 'Channel: webhook|stdout|file', 'stdout')
  .option('--webhook-url <url>', 'Webhook URL (for webhook channel)')
  .option('--file-path <path>', 'File path (for file channel)')
  .option('--name <name>', 'Alert name')
  .action((opts: {
    type: string; threshold: string; channel: string;
    webhookUrl?: string; filePath?: string; name?: string;
  }) => {
    const rules = loadRules();
    const rule: AlertRule = {
      id: `alert-${Date.now()}`,
      type: opts.type as AlertType,
      name: opts.name ?? `${opts.type} alert`,
      threshold: parseFloat(opts.threshold),
      channel: opts.channel as AlertChannel,
      channelConfig: buildChannelConfig(opts),
      enabled: true,
    };

    rules.push(rule);
    saveRules(rules);
    console.log(chalk.green(`✅ Alert rule created: ${rule.name} (${rule.id})`));
  });

function buildChannelConfig(opts: Record<string, unknown>): Record<string, unknown> {
  if (opts.channel === 'webhook' && opts.webhookUrl) {
    return { url: opts.webhookUrl as string };
  }
  if (opts.channel === 'file' && opts.filePath) {
    return { path: opts.filePath as string };
  }
  return {};
}

function loadRules(): AlertRule[] {
  if (!existsSync(CONFIG_PATH)) return [];
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8')) as AlertRule[];
}

function saveRules(rules: AlertRule[]): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(rules, null, 2), 'utf-8');
}
