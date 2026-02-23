/**
 * Anti-pattern checks for project structure validation.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ValidationWarning } from './structure.validator.js';

/**
 * Check for common anti-patterns
 */
export function checkAntiPatterns(projectRoot: string): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  const rootFiles = ['.DS_Store', 'Thumbs.db', 'desktop.ini'];
  for (const file of rootFiles) {
    const filePath = resolve(projectRoot, file);
    if (existsSync(filePath)) {
      warnings.push({
        file,
        message: 'Unnecessary file in root directory',
      });
    }
  }

  const envPath = resolve(projectRoot, '.env');
  if (existsSync(envPath)) {
    warnings.push({
      file: '.env',
      message: '.env file should not be committed to version control',
    });
  }

  const nodeModulesPath = resolve(projectRoot, 'node_modules');
  if (!existsSync(nodeModulesPath)) {
    warnings.push({
      file: 'node_modules',
      message: 'Dependencies not installed',
    });
  }

  return warnings;
}
