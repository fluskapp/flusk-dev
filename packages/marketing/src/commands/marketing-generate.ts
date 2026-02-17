/**
 * CLI command: flusk marketing generate
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { createLogger } from '@flusk/logger';
import { generateReleaseNotes } from '../content/generate-release-notes.js';
import { generateSocialPosts } from '../content/generate-social-posts.js';
import { generateReleaseVideo } from '../video/generate-release-video.js';
import { generateOgImage } from '../images/generate-og-image.js';
import { createDraftPr } from '../drafts/create-draft-pr.js';
import type { GeneratedContent } from '../types.js';

const log = createLogger({ name: 'marketing:generate' });

export const marketingGenerateCommand = new Command('generate')
  .description('Generate marketing drafts for latest release')
  .option('-v, --version <version>', 'Specific version to generate for')
  .option('--no-video', 'Skip video generation')
  .option('--no-pr', 'Skip PR creation')
  .action(async (opts: {
    version?: string;
    video: boolean;
    pr: boolean;
  }) => {
    const repoRoot = resolve(process.cwd());
    log.info('Generating marketing content...');

    const release = await generateReleaseNotes(repoRoot, opts.version);
    const posts = await generateSocialPosts(release);

    const outputDir = resolve(repoRoot, `drafts/v${release.version}`);
    let videoPath = '';
    let gifPath = '';
    let ogImagePath = '';

    if (opts.video) {
      const video = await generateReleaseVideo(release, outputDir);
      videoPath = video.mp4;
      gifPath = video.gif;
      ogImagePath = await generateOgImage(release, outputDir);
    }

    const content: GeneratedContent = {
      release, posts, videoPath, gifPath, ogImagePath,
    };

    if (opts.pr) {
      await createDraftPr(content, repoRoot);
    }

    log.info(`Marketing content generated for v${release.version}`);
  });
