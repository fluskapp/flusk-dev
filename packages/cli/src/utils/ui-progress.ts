/**
 * Flusk CLI UI Progress & Spinner utilities
 */

import type { Ora } from 'ora';
import { ui, icons } from './ui-theme.js';

// ============================================================================
// Progress Display
// ============================================================================

/**
 * Format file tree with status indicators
 */
export function formatTree(
  root: string,
  items: Array<{ path: string; status: 'success' | 'error' | 'pending' }>
): string {
  const lines = [ui.code(`${icons.package} ${root}`)];

  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const prefix = isLast ? '└─' : '├─';

    let statusIcon: string;
    let colorFn: typeof ui.success;

    switch (item.status) {
      case 'success':
        statusIcon = icons.success;
        colorFn = ui.success;
        break;
      case 'error':
        statusIcon = icons.error;
        colorFn = ui.error;
        break;
      case 'pending':
        statusIcon = icons.pending;
        colorFn = ui.muted;
        break;
    }

    lines.push(colorFn(`  ${prefix} ${statusIcon} ${item.path}`));
  });

  return lines.join('\n');
}

/**
 * Format step-by-step progress list
 */
export function formatStepProgress(
  steps: Array<{
    label: string;
    status: 'success' | 'error' | 'pending' | 'skipped';
    detail?: string;
  }>
): string {
  return steps
    .map((step) => {
      let statusIcon: string;
      let colorFn: typeof ui.success;

      switch (step.status) {
        case 'success':
          statusIcon = icons.success;
          colorFn = ui.success;
          break;
        case 'error':
          statusIcon = icons.error;
          colorFn = ui.error;
          break;
        case 'pending':
          statusIcon = icons.pending;
          colorFn = ui.muted;
          break;
        case 'skipped':
          statusIcon = '⏹️';
          colorFn = ui.muted;
          break;
      }

      const detail = step.detail ? ` (${step.detail})` : '';
      return colorFn(`${statusIcon} ${step.label}${detail}`);
    })
    .join('\n');
}

// ============================================================================
// Next Steps / Suggestions
// ============================================================================

/**
 * Format "Next steps" section with commands
 */
export function formatNextSteps(commands: string[]): string {
  const lines = [ui.warning(`\n${icons.tip} Next steps:`)];

  commands.forEach((cmd) => {
    lines.push(ui.warning(`   ${cmd}`));
  });

  return lines.join('\n');
}

// ============================================================================
// Spinner Helpers
// ============================================================================

/**
 * Create spinner with consistent styling
 */
export function createSpinner(text: string): Ora {
  const ora = require('ora');
  return ora({
    text: ui.info(text),
    spinner: 'dots',
  });
}

/**
 * Run async task with spinner
 */
export async function withSpinner<T>(
  text: string,
  task: () => Promise<T>,
  successMessage?: string
): Promise<T> {
  const spinner = createSpinner(text);
  spinner.start();

  try {
    const result = await task();
    spinner.succeed(successMessage || text);
    return result;
  } catch (error) {
    spinner.fail(`${text} failed`);
    throw error;
  }
}
