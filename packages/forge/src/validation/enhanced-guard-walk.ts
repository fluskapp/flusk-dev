/**
 * File walker for enhanced guard — collects .ts/.tsx files recursively.
 */

import { resolve } from 'node:path';
import { readdirSync, existsSync } from 'node:fs';
import { SKIP_DIRS } from './enhanced-guard-types.js';

/** Walk a directory tree collecting .ts/.tsx files */
export function walkFiles(dir: string): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}
