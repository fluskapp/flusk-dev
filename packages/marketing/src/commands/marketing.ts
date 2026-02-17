/**
 * CLI command: flusk marketing (parent command)
 */

import { Command } from 'commander';
import { marketingGenerateCommand } from './marketing-generate.js';
import { marketingPublishCommand } from './marketing-publish.js';

export const marketingCommand = new Command('marketing')
  .description('Release marketing content automation')
  .addCommand(marketingGenerateCommand)
  .addCommand(marketingPublishCommand);
