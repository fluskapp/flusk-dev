/**
 * @flusk/proxy — transparent LLM proxy for zero-code instrumentation
 */

export { createProxyServer } from './server.js';
export { PRICING } from './pricing.js';
export { SmartRouter } from './router.js';
export { HealthTracker } from './health-tracker.js';
export { DEFAULT_ROUTER_CONFIG } from './router-config.js';
export type { ProxyOptions } from './server.js';
export type { CapturedCall } from './capture.js';
export type { ProviderInfo } from './providers/detect.js';
export type {
  RouterConfig, ProviderTarget, RoutingDecision, RoutingStrategy,
} from './router-config.js';
