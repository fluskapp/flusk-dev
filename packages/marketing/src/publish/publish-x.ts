/**
 * Publishes a post to X/Twitter via API.
 */

import { createLogger } from '@flusk/logger';
import type { PublishResult } from '../types.js';

const log = createLogger({ name: 'marketing:publish-x' });

const REQUIRED_VARS = [
  'X_API_KEY',
  'X_API_SECRET',
  'X_ACCESS_TOKEN',
  'X_ACCESS_SECRET',
] as const;

export async function publishToX(text: string): Promise<PublishResult> {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    log.warn(`Skipping X publish — missing: ${missing.join(', ')}`);
    return { platform: 'x', success: false, error: 'Missing env vars' };
  }

  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env['X_ACCESS_TOKEN']}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`X API ${response.status}: ${await response.text()}`);
    }

    const data = (await response.json()) as { data?: { id?: string } };
    const url = `https://x.com/i/status/${data.data?.id}`;
    log.info(`Published to X: ${url}`);
    return { platform: 'x', success: true, url };
  } catch (err) {
    log.error(`X publish failed: ${err}`);
    return { platform: 'x', success: false, error: String(err) };
  }
}
