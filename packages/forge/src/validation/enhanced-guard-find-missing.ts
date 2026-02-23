/**
 * Check for .ts/.tsx files missing @generated headers.
 */

import { resolve, relative } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { walkFiles } from './enhanced-guard-walk.js';

/**
 * Find new .ts/.tsx files in packages/ (except forge/) without @generated headers.
 */
export function findMissingHeaders(projectRoot: string): string[] {
  const packagesDir = resolve(projectRoot, 'packages');
  if (!existsSync(packagesDir)) return [];

  const missing: string[] = [];
  const allFiles = walkFiles(packagesDir);

  for (const abs of allFiles) {
    const rel = relative(projectRoot, abs);
    if (rel.startsWith('packages/forge/')) continue;
    if (rel.endsWith('.test.ts') || rel.endsWith('.d.ts')) continue;
    if (rel.endsWith('/index.ts') || rel === 'index.ts') continue;

    const head = readFileSync(abs, 'utf-8').slice(0, 500);
    if (!head.includes('@generated')) {
      missing.push(rel);
    }
  }
  return missing;
}
