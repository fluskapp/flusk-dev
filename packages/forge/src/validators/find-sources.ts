/**
 * Utility: find all TypeScript source files in packages/
 */

import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

const IGNORE = ['node_modules', 'dist', '.git', 'coverage'];

/**
 * Recursively find .ts files under packages/
 */
export async function findSources(root: string): Promise<string[]> {
  const packagesDir = resolve(root, 'packages');
  const files: string[] = [];
  await walk(packagesDir, files);
  return files;
}

async function walk(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORE.includes(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, out);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
}
