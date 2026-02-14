/** @generated —
 * Check: default exports (should be named exports)
 */

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { findSources } from './find-sources.js';
import type { Violation } from './run-validation.js';

const DEFAULT_EXPORT_RE = /^export\s+default\s/;

/**
 * Find files using default exports
 */
export async function checkDefaultExports(root: string): Promise<Violation[]> {
  const files = await findSources(root);
  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (DEFAULT_EXPORT_RE.test(lines[i].trim())) {
        violations.push({
          rule: 'no-default-export',
          file: relative(root, file),
          line: i + 1,
          message: 'Use named exports instead of default exports',
        });
      }
    }
  }

  return violations;
}
