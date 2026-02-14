/** @generated —
 * Webhook client — fire-and-forget POST to Slack/Discord webhooks
 */
import { request } from 'undici';
import { createLogger } from '@flusk/logger';

const log = createLogger('webhook');

export interface WebhookPayload {
  text: string;
}

export async function sendWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  try {
    await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    log.info('Webhook sent', { url: url.slice(0, 40) + '...' });
  } catch (err) {
    log.error('Webhook failed', { error: err });
  }
}

export function fireAndForget(
  url: string | undefined,
  alerts: string[],
): void {
  if (!url || alerts.length === 0) return;
  const text = `🚨 Flusk Budget Alert\n${alerts.map((a) => `• ${a}`).join('\n')}`;
  void sendWebhook(url, { text });
}
