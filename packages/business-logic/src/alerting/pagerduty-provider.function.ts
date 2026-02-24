/**
 * PagerDuty alert provider.
 */

import { getLogger } from '@flusk/logger';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';

const logger = getLogger();

const PAGERDUTY_EVENTS_URL = 'https://events.pagerduty.com/v2/enqueue';

/** PagerDuty provider — sends events via Events API v2 */
export const pagerdutyProvider: AlertProvider = {
  name: 'pagerduty',

  async send(alert: AlertPayload, config: Record<string, unknown>): Promise<void> {
    const routingKey = config.routing_key as string;
    if (!routingKey) throw new Error('PagerDuty routing_key is required');

    const severity = alert.severity === 'critical' ? 'critical' : 'warning';
    const body = {
      routing_key: routingKey,
      event_action: 'trigger',
      payload: {
        summary: `[${alert.alertType}] ${alert.title}`,
        severity,
        source: 'flusk',
        custom_details: { message: alert.message, ...alert.metadata },
      },
    };

    const res = await fetch(PAGERDUTY_EVENTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.error({ status: res.status, text }, 'PagerDuty send failed');
      throw new Error(`PagerDuty API error: ${res.status}`);
    }
    logger.info({ alertType: alert.alertType }, 'PagerDuty alert sent');
  },

  async test(config: Record<string, unknown>): Promise<boolean> {
    return typeof config.routing_key === 'string' && config.routing_key.length > 0;
  },
};
