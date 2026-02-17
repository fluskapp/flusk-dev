/**
 * CLI command: flusk marketing — delegates to @flusk/marketing.
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { createLogger } from '@flusk/logger';

const log = createLogger({ name: 'marketing' });

const generateCmd = new Command('generate')
  .description('Generate marketing drafts for latest release')
  .option('-v, --version <version>', 'Specific version')
  .option('--no-video', 'Skip video generation')
  .option('--no-pr', 'Skip PR creation')
  .action(async (opts) => {
    const { generateReleaseNotes } = await import('@flusk/marketing');
    const { generateSocialPosts } = await import('@flusk/marketing');
    const { createDraftPr } = await import('@flusk/marketing');
    const root = resolve(process.cwd());

    log.info('Generating marketing content...');
    const release = await generateReleaseNotes(root, opts.version);
    const posts = await generateSocialPosts(release);
    const content = { release, posts };

    if (opts.pr) await createDraftPr(content, root);
    log.info(`Done — v${release.version}`);
  });

const publishCmd = new Command('publish')
  .description('Publish approved marketing drafts')
  .requiredOption('-v, --version <version>', 'Version to publish')
  .action(async (opts) => {
    const { publishAll } = await import('@flusk/marketing');
    const root = resolve(process.cwd());

    log.info(`Publishing v${opts.version}...`);
    const results = await publishAll(root, opts.version);
    for (const r of results) {
      log.info(`${r.success ? '✅' : '❌'} ${r.platform}`);
    }
  });

export const marketingCommand = new Command('marketing')
  .description('Release marketing content automation')
  .addCommand(generateCmd)
  .addCommand(publishCmd);
