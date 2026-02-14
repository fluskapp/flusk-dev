/** @generated —
 * Flusk CLI UI Formatters
 * Message formatting, error display, and layout helpers
 */

import { ui, icons } from './ui-theme.js';

// ============================================================================
// Message Formatters
// ============================================================================

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return ui.success(`${icons.success} ${message}`);
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return ui.error(`${icons.error} ${message}`);
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return ui.warning(`${icons.warning} ${message}`);
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return ui.info(`${icons.info} ${message}`);
}

/**
 * Format tip/suggestion message
 */
export function formatTip(message: string): string {
  return ui.warning(`${icons.tip} ${message}`);
}

// ============================================================================
// Error Formatting with Fix Suggestions
// ============================================================================

/**
 * Format error with automatic fix suggestion
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
 */
export function header(title: string, icon?: string): string {
  const headerText = icon ? `${icon} ${title}` : title;
  const separator = '━'.repeat(Math.min(title.length + (icon ? 3 : 0), 60));
  return ui.header(headerText) + '\n' + ui.separator(separator);
}

/**
 * Create horizontal separator
 */
export function separator(length: number = 60): string {
  return ui.separator('━'.repeat(length));
}

/**
 * Create indented text
 */
export function indent(text: string, level: number = 1): string {
  const spaces = '  '.repeat(level);
  return text
    .split('\n')
    .map((line) => `${spaces}${line}`)
    .join('\n');
}
