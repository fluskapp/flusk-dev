/**
 * Discord alert provider — sends via webhook.
 */

import { getLogger } from '@flusk/logger';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';

const logger = getLogger();

const SEVERITY_COLOR: Record<string, number> = {
  critical: 0xff0000,
  warning: 0xffaa00,
  info: 0x0099ff,
};

/** Discord provider — posts embed to a webhook URL */
export const discordProvider: AlertProvider = {
  name: 'discord',

  async send(alert: AlertPayload, config: Record<string, unknown>): Promise<void> {
    const webhookUrl = config.webhook_url as string;
    if (!webhookUrl) throw new Error('Discord webhook_url is required');

    const body = {
      embeds: [{
        title: `[${alert.severity.toUpperCase()}] ${alert.title}`,
        description: alert.message,
        color: SEVERITY_COLOR[alert.severity] ?? 0x808080,
        footer: { text: `flusk · ${alert.alertType}` },
      }],
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.error({ status: res.status }, 'Discord send failed');
      throw new Error(`Discord webhook error: ${res.status}`);
    }
    logger.info({ alertType: alert.alertType }, 'Discord alert sent');
  },

  async test(config: Record<string, unknown>): Promise<boolean> {
    const url = config.webhook_url as string;
    return typeof url === 'string' && url.includes('discord.com/api/webhooks/');
  },
};
