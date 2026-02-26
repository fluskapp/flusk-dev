/**
 * Smart router types and configuration defaults.
 */

export type RoutingStrategy = 'fallback' | 'cost' | 'latency' | 'round-robin';

export interface ProviderTarget {
  provider: string;
  model: string;
  endpoint: string;
  apiKey?: string;
  weight: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export interface RouterConfig {
  strategy: RoutingStrategy;
  targets: ProviderTarget[];
  fallbackChain?: string[];
  maxRetries: number;
  healthCheckCooldownMs: number;
}

export interface RoutingDecision {
  target: ProviderTarget;
  reason: string;
  fallbackIndex: number;
}

export const DEFAULT_ROUTER_CONFIG: RouterConfig = {
  strategy: 'fallback',
  targets: [],
  maxRetries: 3,
  healthCheckCooldownMs: 30_000,
};
