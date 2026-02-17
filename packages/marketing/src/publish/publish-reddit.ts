/**
 * Publishes a post to Reddit via API.
 */

import { createLogger } from '@flusk/logger';
import type { PublishResult } from '../types.js';

const log = createLogger({ name: 'marketing:publish-reddit' });

const REQUIRED_VARS = [
  'REDDIT_CLIENT_ID',
  'REDDIT_CLIENT_SECRET',
  'REDDIT_USERNAME',
  'REDDIT_PASSWORD',
] as const;

const SUBREDDITS = ['opensource', 'node'];

export async function publishToReddit(
  title: string,
  text: string,
): Promise<PublishResult> {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    log.warn(`Skipping Reddit publish — missing: ${missing.join(', ')}`);
    return { platform: 'reddit', success: false, error: 'Missing env vars' };
  }

  try {
    const token = await getRedditToken();

    for (const sub of SUBREDDITS) {
      await fetch('https://oauth.reddit.com/api/submit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          kind: 'self', sr: sub, title, text,
        }),
      });
      log.info(`Posted to r/${sub}`);
    }

    return { platform: 'reddit', success: true };
  } catch (err) {
    log.error(`Reddit publish failed: ${err}`);
    return { platform: 'reddit', success: false, error: String(err) };
  }
}

async function getRedditToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env['REDDIT_CLIENT_ID']}:${process.env['REDDIT_CLIENT_SECRET']}`,
  ).toString('base64');

  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'password',
      username: process.env['REDDIT_USERNAME']!,
      password: process.env['REDDIT_PASSWORD']!,
    }),
  });

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}
