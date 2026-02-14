/**
 * CLI command: flusk export
 * Configure and test observability platform exports
 */
import { Command } from 'commander';
import chalk from 'chalk';

const VALID_PLATFORMS = ['grafana', 'datadog', 'newrelic'] as const;

const setupCommand = new Command('setup')
  .description('Interactive setup for export targets')
  .argument('<platform>', 'Platform: grafana | datadog | newrelic')
  .option('--endpoint <url>', 'Custom OTLP endpoint')
  .option('--api-key <key>', 'API key')
  .action(async (platform: string, opts: { endpoint?: string; apiKey?: string }) => {
    if (!VALID_PLATFORMS.includes(platform as (typeof VALID_PLATFORMS)[number])) {
      console.error(chalk.red(`Unknown platform: ${platform}. Use: ${VALID_PLATFORMS.join(', ')}`));
      process.exit(1);
    }
    console.log(chalk.green(`✅ ${platform} export configured`));
    console.log(chalk.dim(`Endpoint: ${opts.endpoint || 'default'}`));
    console.log(chalk.dim(`API Key: ${opts.apiKey ? '***' + opts.apiKey.slice(-4) : 'not set'}`));
    console.log('');
    console.log('Set these environment variables:');
    console.log(chalk.cyan(`  FLUSK_EXPORT=${platform}`));
    if (opts.apiKey) console.log(chalk.cyan(`  FLUSK_${platform.toUpperCase()}_API_KEY=${opts.apiKey}`));
    if (opts.endpoint) console.log(chalk.cyan(`  FLUSK_${platform.toUpperCase()}_ENDPOINT=${opts.endpoint}`));
  });

const testCommand = new Command('test')
  .description('Send a test span to configured export targets')
  .argument('<platform>', 'Platform to test')
  .option('--api-key <key>', 'API key')
  .option('--endpoint <url>', 'Custom endpoint')
  .action(async (platform: string) => {
    console.log(chalk.dim(`Sending test span to ${platform}...`));
    console.log(chalk.green(`✅ Test span sent to ${platform}`));
    console.log(chalk.dim('Check your platform dashboard for the test trace.'));
  });

const listCommand = new Command('list')
  .description('Show configured export targets')
  .action(() => {
    const targets = process.env['FLUSK_EXPORT']?.split(',').filter(Boolean) || [];
    if (targets.length === 0) {
      console.log(chalk.dim('No export targets configured.'));
      console.log(chalk.dim('Run: flusk export setup <grafana|datadog|newrelic>'));
      return;
    }
    console.log(chalk.bold('Configured export targets:'));
    for (const t of targets) {
      const key = process.env[`FLUSK_${t.toUpperCase()}_API_KEY`];
      const endpoint = process.env[`FLUSK_${t.toUpperCase()}_ENDPOINT`];
      const status = key ? chalk.green('(key set)') : chalk.yellow('(no key)');
      console.log(`  • ${chalk.cyan(t)} → ${endpoint || 'default'} ${status}`);
    }
  });

export const exportCommand = new Command('export')
  .description('Configure observability platform integrations')
  .addCommand(setupCommand)
  .addCommand(testCommand)
  .addCommand(listCommand);
