/**
 * Circuit breaker — prevents runaway costs by checking spending limits.
 */

import type { AlertEventEntity } from '@flusk/entities';

/** Budget limit configuration */
export interface CircuitBreakerConfig {
  readonly dailyLimit: number;
  readonly monthlyLimit: number;
  readonly hardLimit: number;
}

/** Check if any circuit breaker limit has been hit */
export function checkCircuit(
  events: AlertEventEntity[],
  config: CircuitBreakerConfig,
): { tripped: boolean; reason?: string } {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const dailyCount = events.filter((e) => e.createdAt >= startOfDay).length;
  const monthlyCount = events.filter((e) => e.createdAt >= startOfMonth).length;
  const totalCount = events.length;

  if (totalCount >= config.hardLimit) {
    return { tripped: true, reason: `Hard limit reached (${totalCount}/${config.hardLimit})` };
  }
  if (monthlyCount >= config.monthlyLimit) {
    return { tripped: true, reason: `Monthly limit reached (${monthlyCount}/${config.monthlyLimit})` };
  }
  if (dailyCount >= config.dailyLimit) {
    return { tripped: true, reason: `Daily limit reached (${dailyCount}/${config.dailyLimit})` };
  }

  return { tripped: false };
}

/** Determine if the system should auto-pause based on alert volume */
export function shouldAutoPause(
  events: AlertEventEntity[],
  config: CircuitBreakerConfig,
): boolean {
  const result = checkCircuit(events, config);
  return result.tripped;
}
