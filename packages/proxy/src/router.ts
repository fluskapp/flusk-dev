/**
 * SmartRouter — picks the best provider target per strategy.
 */

import type {
  RouterConfig, ProviderTarget, RoutingDecision,
} from './router-config.js';
import { DEFAULT_ROUTER_CONFIG } from './router-config.js';
import { HealthTracker } from './health-tracker.js';

export class SmartRouter {
  private config: RouterConfig;
  private health: HealthTracker;
  private rrIndex = 0;

  constructor(config: Partial<RouterConfig> = {}) {
    this.config = { ...DEFAULT_ROUTER_CONFIG, ...config };
    this.health = new HealthTracker(this.config.healthCheckCooldownMs);
  }

  route(): RoutingDecision | null {
    const healthy = this.config.targets.filter(
      (t) => this.health.isHealthy(t.provider, t.model),
    );
    if (healthy.length === 0) return null;

    switch (this.config.strategy) {
      case 'fallback': return this.fallback(healthy);
      case 'cost': return this.cheapest(healthy);
      case 'latency': return this.fastest(healthy);
      case 'round-robin': return this.roundRobin(healthy);
      default: return this.fallback(healthy);
    }
  }

  reportOutcome(
    target: ProviderTarget,
    latencyMs: number, success: boolean, statusCode: number,
  ): void {
    this.health.report(
      target.provider, target.model, latencyMs, success, statusCode,
    );
  }

  private fallback(targets: ProviderTarget[]): RoutingDecision {
    const chain = this.config.fallbackChain;
    if (chain?.length) {
      const found = chain
        .map((m) => targets.find((t) => t.model === m))
        .find(Boolean);
      if (found) {
        return { target: found, reason: 'fallback-chain', fallbackIndex: 0 };
      }
    }
    return { target: targets[0]!, reason: 'fallback-first', fallbackIndex: 0 };
  }

  private cheapest(targets: ProviderTarget[]): RoutingDecision {
    const sorted = [...targets].sort(
      (a, b) => a.costPer1kInput - b.costPer1kInput,
    );
    return { target: sorted[0]!, reason: 'lowest-cost', fallbackIndex: 0 };
  }

  private fastest(targets: ProviderTarget[]): RoutingDecision {
    const sorted = [...targets].sort((a, b) => {
      const la = this.health.avgLatency(a.provider, a.model);
      const lb = this.health.avgLatency(b.provider, b.model);
      return la - lb;
    });
    return { target: sorted[0]!, reason: 'lowest-latency', fallbackIndex: 0 };
  }

  private roundRobin(targets: ProviderTarget[]): RoutingDecision {
    const idx = this.rrIndex % targets.length;
    this.rrIndex++;
    return {
      target: targets[idx]!, reason: 'round-robin', fallbackIndex: idx,
    };
  }
}
