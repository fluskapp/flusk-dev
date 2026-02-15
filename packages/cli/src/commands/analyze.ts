/**
 * CLI command: flusk analyze <script>
 * Spawns user script with OTel instrumentation, captures LLM calls.
 * Local mode (default): direct SQLite export, no HTTP server.
 * Server mode: ephemeral OTLP receiver over HTTP.
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createSqliteStorage } from '@flusk/resources';
import { startReceiver } from './analyze-receiver.js';
import { generateReport } from './analyze-report.js';
import { loadConfig } from '@flusk/forge';
import { createLogger } from '@flusk/logger';
import { runBudgetCheck } from './analyze-budget.js';

const log = createLogger({ name: 'analyze' });

export const analyzeCommand = new Command('analyze')
  .description('Analyze LLM costs of a script in real-time')
  .argument('<script>', 'Script to analyze')
  .option('-d, --duration <seconds>', 'Duration in seconds (0 = until exit)', '60')
  .option('-o, --output <file>', 'Write report to file')
  .option('-f, --format <format>', 'Report format (markdown|json)', 'markdown')
  .option('-a, --agent <name>', 'Label for multi-agent tracking')
  .option('-m, --mode <mode>', 'Export mode (local|server)', 'local')
  .action(async (script: string, opts) => {
    const duration = parseInt(opts.duration, 10);
    const config = await loadConfig();
    const mode = opts.mode as 'local' | 'server';
    const agentLabel = opts.agent || config.agent || process.env.FLUSK_AGENT;
    const storage = createSqliteStorage(config.storage?.path);
    const receiver = mode === 'server' ? await startReceiver(storage) : null;

    console.log(chalk.cyan(`🔍 Analyzing ${script}...`));
    if (receiver) console.log(chalk.dim(`   OTLP receiver on port ${receiver.port}`));
    else console.log(chalk.dim('   Local mode — direct SQLite export'));
    if (duration > 0) console.log(chalk.dim(`   Duration: ${duration}s`));

    const session = storage.analyzeSessions.create({
      script, durationMs: duration * 1000, totalCalls: 0,
      totalCost: 0, modelsUsed: [], startedAt: new Date().toISOString(),
    });

    const child = spawnChild(script, mode, receiver?.port, agentLabel);
    const exitCode = await waitForCompletion(child, duration);
    if (receiver) await receiver.close();

    const calls = storage.llmCalls.list(10_000, 0);
    const totalCost = storage.llmCalls.sumCost();
    const models = storage.llmCalls.countByModel().map((m) => m.model);
    const totalCalls = receiver ? receiver.getCallCount() : calls.length;

    storage.analyzeSessions.update(session.id, {
      completedAt: new Date().toISOString(),
      totalCalls, totalCost, modelsUsed: models,
    });

    const report = generateReport(
      { session: { ...session, totalCalls, totalCost, modelsUsed: models }, calls },
      { format: opts.format as 'markdown' | 'json', color: !opts.output },
    );

    if (opts.output) {
      await writeFile(resolve(opts.output), report, 'utf-8');
      console.log(chalk.green(`\n✅ Report written to ${opts.output}`));
    } else {
      console.log('\n' + report);
    }

    runBudgetCheck(config, storage, calls);
    log.info({ exitCode, calls: totalCalls }, 'Analysis complete');
  });

function spawnChild(
  script: string, mode: string, port?: number, agent?: string,
) {
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    FLUSK_MODE: mode,
    FLUSK_SQLITE_PATH: resolve(process.env.HOME ?? '~', '.flusk', 'data.db'),
    ...(port ? { FLUSK_ENDPOINT: `http://127.0.0.1:${port}` } : {}),
    ...(agent ? { FLUSK_AGENT: agent, FLUSK_AGENT_LABEL: agent } : {}),
  };
  return spawn('node', ['--import', '@flusk/otel', resolve(script)], {
    stdio: 'inherit', env,
  });
}

function waitForCompletion(
  child: ReturnType<typeof spawn>, duration: number,
): Promise<number> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (code: number) => { if (timer) clearTimeout(timer); resolve(code); };
    child.on('exit', (code) => cleanup(code ?? 1));
    child.on('error', () => cleanup(1));
    if (duration > 0) timer = setTimeout(() => { child.kill('SIGTERM'); }, duration * 1000);
    process.on('SIGINT', () => { child.kill('SIGTERM'); });
  });
}
