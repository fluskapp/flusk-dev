/**
 * Alert dispatcher — routes alerts to configured channels.
 */

import { getLogger } from '@flusk/logger';
import type { AlertChannelEntity } from '@flusk/entities';
import type { AlertProvider, AlertPayload } from './alert-provider.function.js';
import { meetsSeverityFilter } from './alert-provider.function.js';
import { pagerdutyProvider } from './pagerduty-provider.function.js';
import { slackProvider } from './slack-provider.function.js';
import { discordProvider } from './discord-provider.function.js';
import { webhookProvider } from './webhook-provider.function.js';
import { emailProvider } from './email-provider.function.js';

const logger = getLogger();

/** Registry of built-in providers */
const PROVIDERS: Record<string, AlertProvider> = {
  pagerduty: pagerdutyProvider,
  slack: slackProvider,
  discord: discordProvider,
  webhook: webhookProvider,
  email: emailProvider,
};

export interface DispatchResult {
  readonly channelName: string;
  readonly delivered: boolean;
  readonly error?: string;
}

/** Dispatch an alert to all matching channels */
export function filterChannels(
  channels: AlertChannelEntity[],
  severity: AlertPayload['severity'],
): AlertChannelEntity[] {
  return channels.filter(
    (ch) => ch.enabled && meetsSeverityFilter(severity, ch.severityFilter),
  );
}

/** Send alert to a single channel, returning delivery result */
export async function sendToChannel(
  alert: AlertPayload,
  channel: AlertChannelEntity,
): Promise<DispatchResult> {
  const provider = PROVIDERS[channel.channelType];
  if (!provider) {
    logger.warn({ channelType: channel.channelType }, 'Unknown provider');
    return { channelName: channel.name, delivered: false, error: 'Unknown provider' };
  }

  try {
    const config = channel.config as Record<string, unknown>;
    await provider.send(alert, config);
    return { channelName: channel.name, delivered: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ channel: channel.name, err: msg }, 'Dispatch failed');
    return { channelName: channel.name, delivered: false, error: msg };
  }
}

/** Dispatch alert to all eligible channels */
export async function dispatchAlert(
  alert: AlertPayload,
  channels: AlertChannelEntity[],
): Promise<DispatchResult[]> {
  const eligible = filterChannels(channels, alert.severity);
  logger.info({ eligible: eligible.length, severity: alert.severity }, 'Dispatching alert');
  return Promise.all(eligible.map((ch) => sendToChannel(alert, ch)));
}
