/**
 * Alerting module — providers, dispatcher, and types.
 */

export type { AlertProvider, AlertPayload } from './alert-provider.function.js';
export { meetsSeverityFilter, SEVERITY_ORDER } from './alert-provider.function.js';
export { pagerdutyProvider } from './pagerduty-provider.function.js';
export { slackProvider } from './slack-provider.function.js';
export { discordProvider } from './discord-provider.function.js';
export { webhookProvider } from './webhook-provider.function.js';
export { emailProvider } from './email-provider.function.js';
export type { DispatchResult } from './alert-dispatcher.function.js';
export { filterChannels, sendToChannel, dispatchAlert } from './alert-dispatcher.function.js';
export type { CircuitBreakerConfig } from './circuit-breaker.function.js';
export { checkCircuit, shouldAutoPause } from './circuit-breaker.function.js';
