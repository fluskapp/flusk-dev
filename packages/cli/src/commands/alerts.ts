/**
 * CLI command: flusk alerts — manage production alerts.
 */
import { Command } from 'commander';

export const alertsCommand = new Command('alerts')
  .description('Manage production alerts');
