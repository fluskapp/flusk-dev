/**
 * Email alert provider (placeholder — uses fetch to an email API).
 */

import { getLogger } from '@flusk/logger';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';

const logger = getLogger();

/** Email provider — sends via configured email API endpoint */
export const emailProvider: AlertProvider = {
  name: 'email',

  async send(alert: AlertPayload, config: Record<string, unknown>): Promise<void> {
    const apiUrl = config.api_url as string;
    const to = config.to as string;
    const apiKey = config.api_key as string;

    if (!apiUrl || !to) throw new Error('Email api_url and to are required');

    const body = {
      to,
      subject: `[Flusk ${alert.severity.toUpperCase()}] ${alert.title}`,
      text: alert.message,
    };

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Email send failed');
      throw new Error(`Email API error: ${res.status}`);
    }
    logger.info({ to, alertType: alert.alertType }, 'Email alert sent');
  },

  async test(config: Record<string, unknown>): Promise<boolean> {
    return (
      typeof config.api_url === 'string' &&
      typeof config.to === 'string' &&
      config.to.includes('@')
    );
  },
};
