/**
 * Main validation runner — collects violations from all checkers
 */

import { checkFileLength } from './check-file-length.js';
import { checkDeepImports } from './check-deep-imports.js';
import { checkDefaultExports } from './check-default-exports.js';
import { checkFilenames } from './check-filenames.js';

export interface Violation {
  rule: string;
  file: string;
  line?: number;
  message: string;
}

/**
 * Run all validation checks and return violations
 */
export async function runValidation(root: string): Promise<Violation[]> {
  const violations: Violation[] = [];

  const checks = [
    checkFileLength(root),
    checkDeepImports(root),
    checkDefaultExports(root),
    checkFilenames(root),
  ];

  const results = await Promise.all(checks);
  for (const result of results) {
    violations.push(...result);
  }

  return violations;
}
