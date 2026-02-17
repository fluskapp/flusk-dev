/**
 * CLI command: flusk marketing publish
 */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { createLogger } from '@flusk/logger';
import { publishAll } from '../publish/publish-all.js';

const log = createLogger({ name: 'marketing:publish' });

export const marketingPublishCommand = new Command('publish')
  .description('Publish approved marketing drafts')
  .requiredOption('-v, --version <version>', 'Version to publish')
  .action(async (opts: { version: string }) => {
    const repoRoot = resolve(process.cwd());
    log.info(`Publishing marketing content for v${opts.version}...`);

    const results = await publishAll(repoRoot, opts.version);

    for (const r of results) {
      if (r.success) {
        log.info(`✅ ${r.platform}: ${r.url ?? 'published'}`);
      } else {
        log.warn(`❌ ${r.platform}: ${r.error}`);
      }
    }
  });
