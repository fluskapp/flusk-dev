/**
 * CLI command: flusk report [session-id]
 * Regenerate analysis report from SQLite data
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSqliteStorage } from '@flusk/resources';
import { generateReport } from './analyze-report.js';

export const reportCommand = new Command('report')
  .description('Regenerate report from past analyze sessions')
  .argument('[session-id]', 'Session ID (default: latest)')
  .option('--all', 'List all sessions')
  .option('-o, --output <file>', 'Write report to file')
  .option('-f, --format <format>', 'Report format (markdown|json)', 'markdown')
  .action(async (sessionId: string | undefined, opts) => {
    const storage = createSqliteStorage();

    if (opts.all) {
      listAllSessions(storage);
      return;
    }

    const session = sessionId
      ? storage.analyzeSessions.findById(sessionId)
      : storage.analyzeSessions.list(1, 0)[0] ?? null;

    if (!session) {
      console.log(chalk.red('❌ No session found.'));
      return;
    }

    const calls = storage.llmCalls.list(10_000, 0);
    const report = generateReport(
      { session, calls },
      { format: opts.format as 'markdown' | 'json', color: !opts.output },
    );

    if (opts.output) {
      await writeFile(resolve(opts.output), report, 'utf-8');
      console.log(chalk.green(`✅ Report written to ${opts.output}`));
    } else {
      console.log(report);
    }
  });

function listAllSessions(storage: ReturnType<typeof createSqliteStorage>) {
  const sessions = storage.analyzeSessions.list(100, 0);
  if (sessions.length === 0) {
    console.log(chalk.dim('No sessions found.'));
    return;
  }
  for (const s of sessions) {
    console.log(`${chalk.cyan(s.id.slice(0, 8))}  ${s.script}  $${s.totalCost.toFixed(2)}  ${s.startedAt.slice(0, 16)}`);
  }
}
