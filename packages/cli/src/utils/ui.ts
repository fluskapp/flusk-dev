/**
 * Flusk CLI UI Utilities
 *
 * Provides consistent UI components for CLI commands following the
 * Flusk UX Specification v1.1
 *
 * Brand Colors:
 * - Primary: #0066CC (Blue) - Info, headers
 * - Success: #00CC66 (Green) - Success states
 * - Warning: #FFAA00 (Yellow) - Warnings
 * - Error: #CC0000 (Red) - Errors
 */

import chalk from 'chalk';
import type { Ora } from 'ora';

// ============================================================================
// Brand Colors
// ============================================================================

/**
 * Flusk brand color palette
 * Reference: CLI_UX_SPECIFICATION.md Section 2.1
 */
export const colors = {
  // Brand primary colors
  primary: '#0066CC',
  success: '#00CC66',
  warning: '#FFAA00',
  error: '#CC0000',

  // State colors
  gray: '#5C6370',
  cyan: '#56B6C2',
} as const;

/**
 * Chalk color functions with brand colors
 */
export const ui = {
  // Semantic colors
  info: chalk.hex(colors.primary),
  success: chalk.hex(colors.success),
  warning: chalk.hex(colors.warning),
  error: chalk.hex(colors.error),

  // Hierarchy
  header: chalk.bold.hex(colors.primary),
  subheader: chalk.hex(colors.primary),
  muted: chalk.dim,

  // Utility
  highlight: chalk.bold.hex(colors.warning),
  code: chalk.hex(colors.cyan),
  separator: chalk.gray,
} as const;

// ============================================================================
// Status Icons
// ============================================================================

/**
 * Status indicators with emoji + text
 * Always pair emoji with text for screen reader compatibility
 */
export const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  pending: '⏳',
  tip: '💡',
  tool: '🔧',
  package: '📦',
  database: '🗄️',
  docker: '🐳',
  launch: '🚀',
  complete: '✨',
} as const;

// ============================================================================
// Message Formatters
// ============================================================================

/**
 * Format success message
 * @example formatSuccess('Migration completed')
 * // ✅ Migration completed
 */
export function formatSuccess(message: string): string {
  return ui.success(`${icons.success} ${message}`);
}

/**
 * Format error message
 * @example formatError('Database connection failed')
 * // ❌ Database connection failed
 */
export function formatError(message: string): string {
  return ui.error(`${icons.error} ${message}`);
}

/**
 * Format warning message
 * @example formatWarning('Deprecated feature detected')
 * // ⚠️  Deprecated feature detected
 */
export function formatWarning(message: string): string {
  return ui.warning(`${icons.warning} ${message}`);
}

/**
 * Format info message
 * @example formatInfo('Starting infrastructure')
 * // ℹ️  Starting infrastructure
 */
export function formatInfo(message: string): string {
  return ui.info(`${icons.info} ${message}`);
}

/**
 * Format tip/suggestion message
 * @example formatTip('Run flusk migrate to update database')
 * // 💡 Run flusk migrate to update database
 */
export function formatTip(message: string): string {
  return ui.warning(`${icons.tip} ${message}`);
}

// ============================================================================
// Error Formatting with Fix Suggestions
// ============================================================================

/**
 * Format error with automatic fix suggestion
 * Following Stripe CLI pattern: Error + Fix command
 *
 * @example
 * formatErrorWithFix(
 *   'DATABASE_URL not found in .env',
 *   'cp .env.example .env',
 *   'Then edit .env and add your database URL'
 * )
 */
export function formatErrorWithFix(
  error: string,
  fixCommand: string,
  additionalContext?: string
): string {
  const lines = [
    ui.error(`${icons.error} Error: ${error}`),
    '',
    ui.warning(`${icons.tip} Fix: ${fixCommand}`),
  ];

  if (additionalContext) {
    lines.push(ui.warning(`   ${additionalContext}`));
  }

  return lines.join('\n');
}

/**
 * Format validation error with code context
 *
 * @example
 * formatValidationError(
 *   'packages/entities/src/user.entity.ts',
 *   12,
 *   'Missing required field Type',
 *   'Add import statement at the top of the file'
 * )
 */
export function formatValidationError(
  filePath: string,
  line: number,
  error: string,
  fix: string
): string {
  return [
    ui.error(`${icons.error} VALIDATION ERROR: ${error}`),
    '',
    ui.muted(filePath),
    '',
    `  Line ${line}: ${error}`,
    '',
    ui.warning(`${icons.tip} Fix: ${fix}`),
  ].join('\n');
}

// ============================================================================
// Layout Helpers
// ============================================================================

/**
 * Create section header
 *
 * @example
 * header('Generating Code')
 * // 🔧 Generating Code
 * // ━━━━━━━━━━━━━━━━━━
 */
export function header(title: string, icon?: string): string {
  const headerText = icon ? `${icon} ${title}` : title;
  const separator = '━'.repeat(Math.min(title.length + (icon ? 3 : 0), 60));
  return ui.header(headerText) + '\n' + ui.separator(separator);
}

/**
 * Create horizontal separator
 *
 * @example separator()
 * // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export function separator(length: number = 60): string {
  return ui.separator('━'.repeat(length));
}

/**
 * Create indented text
 *
 * @example indent('Nested item', 2)
 * //   Nested item
 */
export function indent(text: string, level: number = 1): string {
  const spaces = '  '.repeat(level);
  return text
    .split('\n')
    .map((line) => `${spaces}${line}`)
    .join('\n');
}

// ============================================================================
// Progress Display
// ============================================================================

/**
 * Format file tree with status indicators
 *
 * @example
 * formatTree('user.entity.ts', [
 *   { path: 'types/user.types.ts', status: 'success' },
 *   { path: 'resources/user.repository.ts', status: 'success' },
 *   { path: 'business-logic/validate-user.ts', status: 'pending' },
 * ])
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
 *
 * @example
 * formatStepProgress([
 *   { label: 'PostgreSQL 16', status: 'success', detail: 'localhost:5432' },
 *   { label: 'Redis 7', status: 'pending' },
 * ])
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
 *
 * @example
 * formatNextSteps([
 *   'flusk g user.entity.ts    # Generate code',
 *   'flusk migrate             # Update database',
 * ])
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
 * Requires: import ora from 'ora'
 *
 * @example
 * const spinner = createSpinner('Installing dependencies');
 * spinner.start();
 * // ... do work
 * spinner.succeed('Dependencies installed');
 */
export function createSpinner(text: string): Ora {
  // Dynamically import ora to avoid issues if not installed
  const ora = require('ora');
  return ora({
    text: ui.info(text),
    spinner: 'dots',
  });
}

/**
 * Run async task with spinner
 *
 * @example
 * await withSpinner('Installing dependencies', async () => {
 *   await installDeps();
 * });
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

// ============================================================================
// Accessibility Helpers
// ============================================================================

/**
 * Strip ANSI color codes from text
 * Useful for NO_COLOR environment or file output
 */
export function stripColors(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

/**
 * Check if NO_COLOR environment variable is set
 * When true, should disable all colors
 */
export function shouldDisableColors(): boolean {
  return !!process.env.NO_COLOR || chalk.level === 0;
}

/**
 * Get text with optional color
 * Respects NO_COLOR environment variable
 */
export function optionalColor(
  text: string,
  colorFn: (text: string) => string
): string {
  return shouldDisableColors() ? text : colorFn(text);
}

// ============================================================================
// Usage Examples
// ============================================================================

/**
 * Example: Success output for code generation
 *
 * console.log(header('Generating Code', icons.tool));
 * console.log('');
 * console.log('Processing entity schema...');
 * console.log(formatSuccess('packages/types/src/user.types.ts'));
 * console.log(formatSuccess('packages/resources/src/user.repository.ts'));
 * console.log('');
 * console.log(formatSuccess('Code generation complete! (4 files created)'));
 * console.log(formatNextSteps([
 *   'flusk migrate             # Update database schema',
 * ]));
 */

/**
 * Example: Error with fix suggestion
 *
 * console.log(formatErrorWithFix(
 *   'DATABASE_URL not found in .env',
 *   'cp .env.example .env',
 *   'Then edit .env and add your database URL'
 * ));
 */

/**
 * Example: Step-by-step progress
 *
 * console.log(header('Starting Infrastructure', icons.docker));
 * console.log('');
 * console.log(formatStepProgress([
 *   { label: 'PostgreSQL 16', status: 'success', detail: 'localhost:5432' },
 *   { label: 'Redis 7', status: 'success', detail: 'localhost:6379' },
 *   { label: 'Adminer', status: 'success', detail: 'http://localhost:8080' },
 * ]));
 * console.log('');
 * console.log(formatSuccess('Infrastructure started successfully!'));
 */
