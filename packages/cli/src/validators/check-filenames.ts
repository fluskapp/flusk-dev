/**
 * Check: non-kebab-case filenames
 */

import { basename, relative } from 'node:path';
import { findSources } from './find-sources.js';
import type { Violation } from './run-validation.js';

const KEBAB_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+)*(\.[a-z]+)*\.ts$/;

/**
 * Find files with non-kebab-case names
 */
export async function checkFilenames(root: string): Promise<Violation[]> {
  const files = await findSources(root);
  const violations: Violation[] = [];

  for (const file of files) {
    const name = basename(file);
    if (!KEBAB_RE.test(name)) {
      violations.push({
        rule: 'kebab-case-filename',
        file: relative(root, file),
        message: `Filename "${name}" is not kebab-case`,
      });
    }
  }

  return violations;
}
