/** @generated — DO NOT EDIT. Regenerate via flusk CLI. */

import { Command } from 'commander';
import { resolve } from 'node:path';
import { setupWizard, clackPrompter } from '../wizard/index.js';

export const setupCommand = new Command('setup')
  .description('Interactive onboarding wizard — set up API keys, infrastructure, and demo')
  .option('--project-root <path>', 'Project root directory', process.cwd())
  .action(async (options) => {
    const projectRoot = resolve(options.projectRoot);
    await setupWizard(clackPrompter, projectRoot);
  });
