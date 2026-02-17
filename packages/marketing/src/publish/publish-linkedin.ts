/**
 * Publishes a post to LinkedIn via API.
 */

import { createLogger } from '@flusk/logger';
import type { PublishResult } from '../types.js';

const log = createLogger({ name: 'marketing:publish-linkedin' });

export async function publishToLinkedin(
  text: string,
): Promise<PublishResult> {
  const token = process.env['LINKEDIN_ACCESS_TOKEN'];
  if (!token) {
    log.warn('Skipping LinkedIn publish — no LINKEDIN_ACCESS_TOKEN');
    return { platform: 'linkedin', success: false, error: 'Missing env vars' };
  }

  try {
    const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = (await meRes.json()) as { sub?: string };
    const authorUrn = `urn:li:person:${me.sub}`;

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text },
            shareMediaCategory: 'NONE',
          },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
      }),
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API ${response.status}`);
    }

    log.info('Published to LinkedIn');
    return { platform: 'linkedin', success: true };
  } catch (err) {
    log.error(`LinkedIn publish failed: ${err}`);
    return { platform: 'linkedin', success: false, error: String(err) };
  }
}
