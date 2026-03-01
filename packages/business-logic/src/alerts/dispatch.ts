/**
 * Dispatch alert events to configured channels.
 */

import { appendFileSync } from 'node:fs';
import { getLogger } from '@flusk/logger';
import type { AlertEvent, AlertRule, WebhookConfig, FileConfig } from './alert.types.js';

const log = getLogger().child({ module: 'alert-dispatch' });

/** Dispatch an alert event via the rule's configured channel. */
export async function dispatchAlert(
  event: AlertEvent,
  rule: AlertRule,
): Promise<boolean> {
  try {
    if (rule.channel === 'webhook') {
      return await sendWebhook(event, rule.channelConfig as WebhookConfig);
    }
    if (rule.channel === 'file') {
      return writeToFile(event, rule.channelConfig as FileConfig);
    }
    // stdout
    console.log(`[ALERT] ${event.severity.toUpperCase()} ${event.message}`);
    return true;
  } catch (err) {
    log.error({ err, ruleId: rule.id }, 'Failed to dispatch alert');
    return false;
  }
}

async function sendWebhook(
  event: AlertEvent,
  config: WebhookConfig,
): Promise<boolean> {
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...config.headers,
    },
    body: JSON.stringify(event),
  });
  return response.ok;
}

function writeToFile(event: AlertEvent, config: FileConfig): boolean {
  const line = JSON.stringify(event) + '\n';
  appendFileSync(config.path, line, 'utf-8');
  return true;
}
