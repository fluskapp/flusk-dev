/**
 * Calculate generator coverage ratio across the project.
 *
 * WHY: We target 90% generated code. This module counts files
 * with @generated headers vs total source files per package,
 * giving visibility into how close we are to the goal.
 */

import { resolve, relative, sep } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

/** Per-package file counts */
export interface PackageCounts {
  generated: number;
  total: number;
}

/** Full ratio result across the project */
export interface RatioResult {
  generated: number;
  total: number;
  byPackage: Record<string, PackageCounts>;
}

const SCAN_DIRS = ['packages'];
const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage']);

/** Compute the generator ratio for a project */
export function computeRatio(projectRoot: string): RatioResult {
  const result: RatioResult = { generated: 0, total: 0, byPackage: {} };

  for (const dir of SCAN_DIRS) {
    const abs = resolve(projectRoot, dir);
    if (!existsSync(abs)) continue;
    walkDir(abs, projectRoot, result);
  }
  return result;
}

/** Recursively walk and count .ts source files */
function walkDir(dir: string, root: string, result: RatioResult): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);

    if (entry.isDirectory()) { walkDir(full, root, result); continue; }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts')) continue;
    if (entry.name.endsWith('.test.ts')) continue;

    const rel = relative(root, full);
    const pkg = extractPackageName(rel);
    if (!result.byPackage[pkg]) result.byPackage[pkg] = { generated: 0, total: 0 };

    result.total++;
    result.byPackage[pkg].total++;

    const content = readFileSync(full, 'utf-8').slice(0, 500);
    if (content.includes('@generated')) {
      result.generated++;
      result.byPackage[pkg].generated++;
    }
  }
}

/** Extract package name from relative path like packages/cli/src/foo.ts */
function extractPackageName(relPath: string): string {
  const parts = relPath.split(sep);
  return parts.length >= 2 ? parts[1] : parts[0];
}
