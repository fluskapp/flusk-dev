/**
 * CLI command: flusk profile
 * Performance profiling via @platformatic/flame
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { profileListCommand } from './profile-list.js';
import { profileReportCommand } from './profile-report.js';
import { profileCompareCommand } from './profile-compare.js';

export const profileRunCommand = new Command('run')
  .description('Start CPU profiling the Flusk server')
  .argument('[script]', 'Script to profile', './dist/index.js')
  .option('-d, --duration <seconds>', 'Duration in seconds', '30')
  .action(async (script: string, opts) => {
    const { startProfiling } = await import('@platformatic/flame');
    console.log(chalk.blue(`🔥 Profiling ${script} for ${opts.duration}s`));
    await startProfiling({
      entrypoint: resolve(script),
      duration: parseInt(opts.duration, 10),
    });
    console.log(chalk.green('✅ Profile complete'));
  });

export const profileGenerateCommand = new Command('generate')
  .description('Generate flamegraph from pprof file')
  .argument('<pprof-file>', 'Path to .pprof file')
  .option('-o, --output <dir>', 'Output directory', './profiles')
  .action(async (pprofFile: string, opts) => {
    const flame = await import('@platformatic/flame');
    const { generateFlamegraph, generateMarkdown } = flame;
    const outputDir = resolve(opts.output);
    console.log(chalk.blue(`📊 Generating flamegraph from ${pprofFile}`));
    const htmlPath = await generateFlamegraph({
      input: resolve(pprofFile),
      outputDir,
    });
    console.log(chalk.green(`  ✅ HTML: ${htmlPath}`));
    const mdPath = await generateMarkdown({
      input: resolve(pprofFile),
      outputDir,
    });
    console.log(chalk.green(`  ✅ MD:   ${mdPath}`));
  });

export const profileAnalyzeCommand = new Command('analyze')
  .description('Print hotspot summary from markdown report')
  .argument('<md-file>', 'Path to .md report file')
  .action(async (mdFile: string) => {
    const content = await readFile(resolve(mdFile), 'utf-8');
    console.log(chalk.blue('\n🔍 Hotspot Summary\n'));
    const lines = content.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ') || line.startsWith('## ')) {
        console.log(chalk.bold.yellow(line));
      } else if (line.includes('%')) {
        console.log(chalk.white(line));
      }
    }
  });

export const profileCommand = new Command('profile')
  .description('Performance profiling with @platformatic/flame');

profileCommand.addCommand(profileRunCommand);
profileCommand.addCommand(profileGenerateCommand);
profileCommand.addCommand(profileAnalyzeCommand);
profileCommand.addCommand(profileListCommand);
profileCommand.addCommand(profileReportCommand);
profileCommand.addCommand(profileCompareCommand);
