/**
 * Alert type definitions for production alerting.
 */

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'budget' | 'latency' | 'error-rate';
export type AlertChannel = 'webhook' | 'stdout' | 'file';

export interface AlertRule {
  id: string;
  type: AlertType;
  name: string;
  threshold: number;
  channel: AlertChannel;
  channelConfig: WebhookConfig | FileConfig | StdoutConfig;
  enabled: boolean;
}

export interface WebhookConfig {
  url: string;
  headers?: Record<string, string>;
}

export interface FileConfig {
  path: string;
}

export interface StdoutConfig {
  prefix?: string;
}

export interface AlertEvent {
  ruleId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  value: number;
  threshold: number;
  timestamp: string;
}
