/**
 * Alert system exports.
 */

export type {
  AlertRule, AlertEvent, AlertSeverity, AlertType, AlertChannel,
  WebhookConfig, FileConfig, StdoutConfig,
} from './alert.types.js';
export { evaluateRules } from './evaluate.js';
export type { MetricSnapshot } from './evaluate.js';
export { dispatchAlert } from './dispatch.js';
