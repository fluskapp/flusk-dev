/**
 * Infrastructure management commands
 * Export all infra subcommands
 */

import { Command } from 'commander';
import { upCommand } from './up.command.js';
import { downCommand } from './down.command.js';
import { resetCommand } from './reset.command.js';
import { logsCommand } from './logs.command.js';
import { statusCommand } from './status.command.js';

export const infraCommand = new Command('infra')
  .description('Manage Docker infrastructure services')
  .addCommand(upCommand)
  .addCommand(downCommand)
  .addCommand(resetCommand)
  .addCommand(logsCommand)
  .addCommand(statusCommand);
