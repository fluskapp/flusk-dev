/** @generated —
 * CLI command: flusk init-config — create .flusk.config.js interactively
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'node:readline';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { createLogger } from '@flusk/logger';

const log = createLogger('init-config');

export const initConfigCommand = new Command('init-config')
  .description('Create a .flusk.config.js file interactively')
  .action(async () => {
    const configPath = resolve(process.cwd(), '.flusk.config.js');
    if (existsSync(configPath)) {
      console.log(chalk.yellow('⚠️  .flusk.config.js already exists'));
      return;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const ask = (q: string): Promise<string> =>
      new Promise((r) => rl.question(q, (a) => r(a.trim())));

    console.log(chalk.cyan('\n🔧 Flusk Configuration Wizard\n'));

    const daily = await ask('Daily budget limit ($, leave empty to skip): ');
    const monthly = await ask('Monthly budget limit ($, leave empty to skip): ');
    const agent = await ask('Default agent name (leave empty to skip): ');
    const webhook = await ask('Webhook URL for alerts (leave empty to skip): ');
    rl.close();

    const content = generateConfigFile({ daily, monthly, agent, webhook });
    await writeFile(configPath, content, 'utf-8');
    console.log(chalk.green(`\n✅ Created ${configPath}`));
    log.info('Config file created');
  });

interface ConfigInput {
  daily: string;
  monthly: string;
  agent: string;
  webhook: string;
}

function generateConfigFile(input: ConfigInput): string {
  const lines = ['/** @type {import("@flusk/cli").FluskConfig} */', 'export default {'];
  const budgetEntries: string[] = [];
  if (input.daily) budgetEntries.push(`    daily: ${parseFloat(input.daily)},`);
  if (input.monthly) budgetEntries.push(`    monthly: ${parseFloat(input.monthly)},`);
  if (budgetEntries.length > 0) {
    lines.push('  budget: {', ...budgetEntries, '  },');
  }
  if (input.agent) lines.push(`  agent: '${input.agent}',`);
  if (input.webhook) {
    lines.push('  alerts: {', `    webhook: '${input.webhook}',`, '  },');
  }
  lines.push('};', '');
  return lines.join('\n');
}
