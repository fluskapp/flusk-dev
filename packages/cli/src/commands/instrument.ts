/**
 * CLI command: flusk instrument <script>
 * Wraps node with --require flag for OTel auto-instrumentation.
 */
import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import chalk from 'chalk';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'instrument-cmd' });

export const instrumentCommand = new Command('instrument')
  .description('Run a script with OTel LLM auto-instrumentation')
  .argument('<script>', 'Script to instrument')
  .option('--dry-run', 'Show the command without running')
  .action(async (script: string, opts: { dryRun?: boolean }) => {
    const scriptPath = resolve(script);
    if (!existsSync(scriptPath)) {
      console.error(chalk.red(`❌ Script not found: ${scriptPath}`));
      process.exitCode = 1;
      return;
    }

    const registerPath = resolveRegisterPath();
    const args = ['--require', registerPath, scriptPath];

    if (opts.dryRun) {
      console.log(chalk.cyan(`node ${args.join(' ')}`));
      return;
    }

    log.info({ script: scriptPath }, 'Starting instrumented process');
    console.log(chalk.green('⚡ Starting with Flusk OTel instrumentation'));

    const child = spawn('node', args, {
      stdio: 'inherit',
      env: { ...process.env, FLUSK_INSTRUMENT: '1' },
    });

    child.on('exit', (code) => {
      process.exitCode = code ?? 0;
    });
  });

function resolveRegisterPath(): string {
  try {
    return require.resolve('@flusk/otel/register');
  } catch {
    return resolve('node_modules/@flusk/otel/dist/register.js');
  }
}
