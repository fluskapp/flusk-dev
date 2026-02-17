/**
 * CLI command: flusk purge --older-than <days>
 * Deletes telemetry data older than the specified number of days.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { getDb, closeDb } from '@flusk/resources';
import { loadConfig } from '@flusk/forge';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'purge' });

export const purgeCommand = new Command('purge')
  .description('Purge old telemetry data')
  .option('--older-than <days>', 'Delete data older than N days')
  .option('--dry-run', 'Show what would be deleted without deleting')
  .action(async (opts) => {
    const config = await loadConfig();
    const days = parseInt(opts.olderThan ?? config.storage?.retentionDays, 10);
    if (!days || days <= 0) {
      console.error(chalk.red('Specify --older-than <days> or set storage.retentionDays in config'));
      process.exit(1);
    }

    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const db = getDb(config.storage?.path);

    const counts = countRows(db, cutoff);
    const total = counts.llmCalls + counts.sessions + counts.patterns;

    if (opts.dryRun) {
      console.log(chalk.yellow(`Would delete ${total} records older than ${days} days`));
      printCounts(counts);
      closeDb();
      return;
    }

    deleteRows(db, cutoff);
    db.exec('VACUUM');
    closeDb();

    console.log(chalk.green(`✅ Purged ${total} records older than ${days} days`));
    printCounts(counts);
    log.info({ days, total }, 'Purge complete');
  });

function countRows(db: ReturnType<typeof getDb>, cutoff: string) {
  const q = (table: string) =>
    (db.prepare(`SELECT count(*) as c FROM ${table} WHERE created_at < ?`).get(cutoff) as { c: number }).c;
  return { llmCalls: q('llm_calls'), sessions: q('analyze_sessions'), patterns: q('performance_patterns') };
}

function deleteRows(db: ReturnType<typeof getDb>, cutoff: string) {
  for (const t of ['llm_calls', 'analyze_sessions', 'performance_patterns']) {
    db.prepare(`DELETE FROM ${t} WHERE created_at < ?`).run(cutoff);
  }
}

function printCounts(c: { llmCalls: number; sessions: number; patterns: number }) {
  console.log(chalk.dim(`  LLM calls: ${c.llmCalls}, Sessions: ${c.sessions}, Patterns: ${c.patterns}`));
}
