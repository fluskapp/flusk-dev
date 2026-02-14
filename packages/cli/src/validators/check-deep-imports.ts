/** @generated —
 * Check: deep imports from @flusk/* packages
 * e.g., `@flusk/entities/foo` instead of `@flusk/entities`
 */

import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { findSources } from './find-sources.js';
import type { Violation } from './run-validation.js';

const DEEP_IMPORT_RE = /from\s+['"]@flusk\/[a-z-]+\/[^'"]+['"]/g;

/**
 * Find deep imports into @flusk/* packages
 */
export async function checkDeepImports(root: string): Promise<Violation[]> {
  const files = await findSources(root);
  const violations: Violation[] = [];

  for (const file of files) {
    const content = await readFile(file, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(DEEP_IMPORT_RE);
      if (match) {
        violations.push({
          rule: 'no-deep-imports',
          file: relative(root, file),
          line: i + 1,
          message: `Deep import: ${match[0]}`,
        });
      }
    }
  }

  return violations;
}
