/**
 * Alert provider interface and types.
 */

import type { AlertEventEntity } from '@flusk/entities';

/** Severity levels ordered by priority */
export const SEVERITY_ORDER = { critical: 0, warning: 1, info: 2 } as const;

/** Payload sent to alert providers */
export interface AlertPayload {
  readonly alertType: AlertEventEntity['alertType'];
  readonly severity: AlertEventEntity['severity'];
  readonly title: string;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

/** Every alert provider must implement this interface */
export interface AlertProvider {
  /** Unique provider name (matches channelType) */
  readonly name: string;
  /** Deliver an alert */
  send(alert: AlertPayload, config: Record<string, unknown>): Promise<void>;
  /** Verify provider configuration is valid */
  test(config: Record<string, unknown>): Promise<boolean>;
}

/** Check if a severity meets the minimum filter threshold */
export function meetsSeverityFilter(
  severity: AlertEventEntity['severity'],
  filter: AlertEventEntity['severity'],
): boolean {
  return SEVERITY_ORDER[severity] <= SEVERITY_ORDER[filter];
}
