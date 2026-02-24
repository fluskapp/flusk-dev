/**
 * Slack alert provider — sends via incoming webhook.
 */

import { getLogger } from '@flusk/logger';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';

const logger = getLogger();

const SEVERITY_EMOJI: Record<string, string> = {
  critical: '🔴',
  warning: '🟡',
  info: '🔵',
};

/** Slack provider — posts to an incoming webhook URL */
export const slackProvider: AlertProvider = {
  name: 'slack',

  async send(alert: AlertPayload, config: Record<string, unknown>): Promise<void> {
    const webhookUrl = config.webhook_url as string;
    if (!webhookUrl) throw new Error('Slack webhook_url is required');

    const emoji = SEVERITY_EMOJI[alert.severity] ?? '⚪';
    const body = {
      text: `${emoji} *[${alert.severity.toUpperCase()}]* ${alert.title}\n${alert.message}`,
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Slack send failed');
      throw new Error(`Slack webhook error: ${res.status}`);
    }
    logger.info({ alertType: alert.alertType }, 'Slack alert sent');
  },

  async test(config: Record<string, unknown>): Promise<boolean> {
    const url = config.webhook_url as string;
    return typeof url === 'string' && url.startsWith('https://hooks.slack.com/');
  },
};
