/** @generated —
 * Budget check logic extracted from analyze command.
 */
import chalk from 'chalk';
import { budget as budgetLogic } from '@flusk/business-logic';
import { WebhookClient, type StorageAdapter } from '@flusk/resources';
import type { LLMCallEntity } from '@flusk/entities';

interface AnalyzeConfig {
  budget?: Parameters<typeof budgetLogic.checkBudget>[0];
  alerts?: { onBudgetExceeded?: string; webhook?: string };
}

export function runBudgetCheck(
  config: AnalyzeConfig,
  storage: StorageAdapter,
  calls: LLMCallEntity[],
): void {
  if (!config.budget) return;

  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const budgetStatus = budgetLogic.checkBudget(config.budget, {
    dailyCost: storage.llmCalls.sumCostSince(dayStart),
    monthlyCost: storage.llmCalls.sumCostSince(monthStart),
    totalCalls: calls.length,
    duplicateCalls: storage.llmCalls.countDuplicates(),
  });

  if (budgetStatus.alerts.length === 0) return;

  console.log(chalk.yellow('\n⚠️  Budget Alerts:'));
  for (const alert of budgetStatus.alerts) {
    console.log(chalk.yellow(`  - ${alert}`));
  }
  if (config.alerts?.onBudgetExceeded === 'block') {
    console.log(chalk.red.bold('\n🛑 BUDGET EXCEEDED — onBudgetExceeded is set to "block"'));
  }
  WebhookClient.fireAndForget(config.alerts?.webhook, budgetStatus.alerts);
}
