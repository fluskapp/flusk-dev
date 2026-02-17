/**
 * Creates a GitHub PR with all generated marketing content drafts.
 */

import { mkdir, writeFile, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createLogger } from '@flusk/logger';
import type { GeneratedContent } from '../types.js';

const execFileAsync = promisify(execFile);
const log = createLogger({ name: 'marketing:draft-pr' });

export async function createDraftPr(
  content: GeneratedContent,
  repoRoot: string,
): Promise<void> {
  const { release, posts } = content;
  const draftDir = resolve(repoRoot, `drafts/v${release.version}`);
  await mkdir(draftDir, { recursive: true });

  await writeFile(resolve(draftDir, 'x-post.md'), posts.x);
  await writeFile(resolve(draftDir, 'linkedin-post.md'), posts.linkedin);
  await writeFile(resolve(draftDir, 'reddit-post.md'), posts.reddit);

  if (content.videoPath && existsSync(content.videoPath)) {
    await copyFile(content.videoPath, resolve(draftDir, 'release-video.mp4'));
  }
  if (content.ogImagePath && existsSync(content.ogImagePath)) {
    await copyFile(content.ogImagePath, resolve(draftDir, 'og-image.png'));
  }

  const branch = `marketing/v${release.version}`;
  const title = `marketing: release v${release.version} content drafts`;

  try {
    await git(repoRoot, 'checkout', '-b', branch);
    await git(repoRoot, 'add', draftDir);
    await git(repoRoot, 'commit', '-m', title);
    await git(repoRoot, 'push', 'origin', branch);
    await createGitHubPr(title, branch, release.version);
    log.info(`Draft PR created: ${title}`);
  } catch (err) {
    log.error('Failed to create draft PR');
    log.debug(String(err));
    throw err;
  }
}

async function git(cwd: string, ...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync('git', args, { cwd });
  return stdout.trim();
}

async function createGitHubPr(
  title: string,
  branch: string,
  version: string,
): Promise<void> {
  const token = process.env['GITHUB_TOKEN'];
  if (!token) {
    log.warn('No GITHUB_TOKEN — push succeeded but PR not created');
    return;
  }

  const { Octokit } = await import('@octokit/rest');
  const octokit = new Octokit({ auth: token });
  const [owner, repo] = await getOwnerRepo();

  await octokit.pulls.create({
    owner, repo, title, head: branch, base: 'main',
    body: `Auto-generated marketing drafts for v${version}.\n\nReview and approve to publish.`,
  });
}

async function getOwnerRepo(): Promise<[string, string]> {
  const { stdout } = await execFileAsync('git', [
    'remote', 'get-url', 'origin',
  ]);
  const match = stdout.match(/[:/]([^/]+)\/([^/.]+)/);
  return [match?.[1] ?? '', match?.[2] ?? ''];
}
