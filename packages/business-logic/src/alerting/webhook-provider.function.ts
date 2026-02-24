/**
 * Generic webhook alert provider.
 */

import { getLogger } from '@flusk/logger';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';

const logger = getLogger();

/** Webhook provider — POSTs JSON payload to a user-defined URL */
export const webhookProvider: AlertProvider = {
  name: 'webhook',

  async send(alert: AlertPayload, config: Record<string, unknown>): Promise<void> {
    const url = config.webhook_url as string;
    if (!url) throw new Error('Webhook url is required');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (typeof config.auth_header === 'string') {
      headers['Authorization'] = config.auth_header;
    }

    const body = {
      alertType: alert.alertType,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      metadata: alert.metadata,
      timestamp: new Date().toISOString(),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Webhook send failed');
      throw new Error(`Webhook error: ${res.status}`);
    }
    logger.info({ alertType: alert.alertType }, 'Webhook alert sent');
  },

  async test(config: Record<string, unknown>): Promise<boolean> {
    const url = config.webhook_url as string;
    return typeof url === 'string' && url.startsWith('https://');
  },
};
