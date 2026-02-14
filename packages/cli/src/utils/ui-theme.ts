/**
 * Flusk CLI UI Theme
 * Brand colors, chalk helpers, and status icons
 *
 * Brand Colors:
 * - Primary: #0066CC (Blue) - Info, headers
 * - Success: #00CC66 (Green) - Success states
 * - Warning: #FFAA00 (Yellow) - Warnings
 * - Error: #CC0000 (Red) - Errors
 */

import chalk from 'chalk';

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
// Accessibility Helpers
// ============================================================================

/**
 * Strip ANSI color codes from text
 * Useful for NO_COLOR environment or file output
 */
export function stripColors(text: string): string {
   
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
