/** @generated —
 * CLI command: flusk dashboard
 * Launches interactive TUI dashboard
 */

import { Command } from 'commander';

export const dashboardCommand = new Command('dashboard')
  .description('Launch interactive TUI dashboard')
  .option(
    '--endpoint <url>',
    'Flusk server URL',
    'http://localhost:3000',
  )
  .option('--api-key <key>', 'Flusk API key')
  .action(async (opts) => {
    const { renderDashboard } = await import('../tui/app.js');
    await renderDashboard(opts);
  });
