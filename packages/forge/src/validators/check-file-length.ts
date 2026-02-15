/**
 * Check: files over 100 lines
 */

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { findSources } from './find-sources.js';
import type { Violation } from './run-validation.js';

/** Max allowed lines per file */
const MAX_LINES = 100;

/**
 * Find files exceeding the line limit
 */
export async function checkFileLength(root: string): Promise<Violation[]> {
  const files = await findSources(root);
  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lineCount = content.split('\n').length;

    if (lineCount > MAX_LINES) {
      violations.push({
        rule: 'max-lines',
        file: relative(root, file),
        message: `File has ${lineCount} lines (max ${MAX_LINES})`,
      });
    }
  }

  return violations;
}
