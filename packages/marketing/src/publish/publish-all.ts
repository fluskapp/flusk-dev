/**
 * Orchestrator: reads approved drafts and publishes to all platforms.
 */

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createLogger } from '@flusk/logger';
import { publishToX } from './publish-x.js';
import { publishToLinkedin } from './publish-linkedin.js';
import { publishToReddit } from './publish-reddit.js';
import type { PublishResult } from '../types.js';

const log = createLogger({ name: 'marketing:publish-all' });

export async function publishAll(
  repoRoot: string,
  version: string,
): Promise<PublishResult[]> {
  const draftDir = resolve(repoRoot, `drafts/v${version}`);
  if (!existsSync(draftDir)) {
    log.error(`No drafts found at ${draftDir}`);
    return [];
  }

  const results: PublishResult[] = [];

  const xPost = await readDraft(draftDir, 'x-post.md');
  if (xPost) results.push(await publishToX(xPost));

  const linkedinPost = await readDraft(draftDir, 'linkedin-post.md');
  if (linkedinPost) results.push(await publishToLinkedin(linkedinPost));

  const redditPost = await readDraft(draftDir, 'reddit-post.md');
  if (redditPost) {
    const title = `Flusk v${version} Released`;
    results.push(await publishToReddit(title, redditPost));
  }

  const succeeded = results.filter((r) => r.success).length;
  log.info(`Published ${succeeded}/${results.length} platforms`);

  return results;
}

async function readDraft(
  dir: string,
  filename: string,
): Promise<string | null> {
  const path = resolve(dir, filename);
  if (!existsSync(path)) {
    log.warn(`Draft not found: ${filename}`);
    return null;
  }
  return readFile(path, 'utf-8');
}
