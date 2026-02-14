/**
 * CLI command: flusk analyze <script>
 * Spawns user script with OTel instrumentation, captures LLM calls
 */
import { Command } from 'commander';
import chalk from 'chalk';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createSqliteStorage } from '@flusk/resources';
import { startReceiver } from './analyze-receiver.js';
import { generateReport } from './analyze-report.js';
import { budget as budgetLogic } from '@flusk/business-logic';
import { WebhookClient } from '@flusk/resources';
import { loadConfig } from '../config/index.js';
import { createLogger } from '@flusk/logger';

const log = createLogger('analyze');

export const analyzeCommand = new Command('analyze')
  .description('Analyze LLM costs of a script in real-time')
  .argument('<script>', 'Script to analyze')
  .option('-d, --duration <seconds>', 'Duration in seconds (0 = until exit)', '60')
  .option('-o, --output <file>', 'Write report to file')
  .option('-f, --format <format>', 'Report format (markdown|json)', 'markdown')
  .option('-a, --agent <name>', 'Label for multi-agent tracking')
  .action(async (script: string, opts) => {
    const duration = parseInt(opts.duration, 10);
    const config = await loadConfig();
    const agentLabel = opts.agent || config.agent || process.env.FLUSK_AGENT;
    const storage = createSqliteStorage(config.storage?.path);
    const receiver = await startReceiver(storage);

    console.log(chalk.cyan(`🔍 Analyzing ${script}...`));
    console.log(chalk.dim(`   OTLP receiver on port ${receiver.port}`));
    if (duration > 0) console.log(chalk.dim(`   Duration: ${duration}s`));

    const session = storage.analyzeSessions.create({
      script,
      durationMs: duration * 1000,
      totalCalls: 0,
      totalCost: 0,
      modelsUsed: [],
      startedAt: new Date().toISOString(),
    });

    const child = spawnChild(script, receiver.port, agentLabel);
    const exitCode = await waitForCompletion(child, duration);
    await receiver.close();

    const calls = storage.llmCalls.list(10_000, 0);
    const totalCost = storage.llmCalls.sumCost();
    const models = storage.llmCalls.countByModel().map((m) => m.model);

    storage.analyzeSessions.update(session.id, {
      completedAt: new Date().toISOString(),
      totalCalls: receiver.getCallCount(),
      totalCost,
      modelsUsed: models,
    });

    const report = generateReport(
      { session: { ...session, totalCalls: receiver.getCallCount(), totalCost, modelsUsed: models }, calls },
      { format: opts.format as 'markdown' | 'json', color: !opts.output },
    );

    if (opts.output) {
      await writeFile(resolve(opts.output), report, 'utf-8');
      console.log(chalk.green(`\n✅ Report written to ${opts.output}`));
    } else {
      console.log('\n' + report);
    }

    // Budget check
    if (config.budget) {
      const now = new Date();
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const budgetStatus = budgetLogic.checkBudget(config.budget, {
        dailyCost: storage.llmCalls.sumCostSince(dayStart),
        monthlyCost: storage.llmCalls.sumCostSince(monthStart),
        totalCalls: calls.length,
        duplicateCalls: storage.llmCalls.countDuplicates(),
      });
      if (budgetStatus.alerts.length > 0) {
        console.log(chalk.yellow('\n⚠️  Budget Alerts:'));
        for (const alert of budgetStatus.alerts) console.log(chalk.yellow(`  - ${alert}`));
        if (config.alerts?.onBudgetExceeded === 'block') {
          console.log(chalk.red.bold('\n🛑 BUDGET EXCEEDED — onBudgetExceeded is set to "block"'));
        }
        WebhookClient.fireAndForget(config.alerts?.webhook, budgetStatus.alerts);
      }
    }

    log.info('Analysis complete', { exitCode, calls: receiver.getCallCount() });
  });

function spawnChild(script: string, port: number, agent?: string) {
  const env = {
    ...process.env,
    FLUSK_MODE: 'local',
    FLUSK_SQLITE_PATH: resolve(process.env.HOME ?? '~', '.flusk', 'data.db'),
    FLUSK_ENDPOINT: `http://127.0.0.1:${port}`,
    ...(agent ? { FLUSK_AGENT: agent, FLUSK_AGENT_LABEL: agent } : {}),
  };
  return spawn('node', ['--import', '@flusk/otel', resolve(script)], {
    stdio: 'inherit',
    env,
  });
}

function waitForCompletion(child: ReturnType<typeof spawn>, duration: number): Promise<number> {
  return new Promise((resolve) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = (code: number) => {
      if (timer) clearTimeout(timer);
      resolve(code);
    };
    child.on('exit', (code) => cleanup(code ?? 1));
    child.on('error', () => cleanup(1));
    if (duration > 0) {
      timer = setTimeout(() => { child.kill('SIGTERM'); }, duration * 1000);
    }
    process.on('SIGINT', () => { child.kill('SIGTERM'); });
  });
}
