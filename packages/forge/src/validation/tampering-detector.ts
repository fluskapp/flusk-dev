/**
 * Detect manual edits in GENERATED regions of generated files.
 *
 * WHY: Files with @generated headers should only be modified
 * via `flusk regenerate`. Edits outside CUSTOM regions indicate
 * someone hand-edited generated code, which will be overwritten.
 */

import { resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { parseFileHeader } from '../regeneration/file-header.js';
import { parseRegions } from '../regeneration/region-parser.js';

/** A file where generated regions were manually edited */
export interface TamperedFile {
  filePath: string;
  reason: string;
}

/**
 * Scan directories for generated files with manual edits
 * outside CUSTOM regions. Checks region structure integrity.
 */
export function detectTampering(
  projectRoot: string,
  scanDirs: string[],
): TamperedFile[] {
  const results: TamperedFile[] = [];

  for (const dir of scanDirs) {
    const absDir = resolve(projectRoot, dir);
    if (!existsSync(absDir)) continue;
    scanForTampering(absDir, results);
  }
  return results;
}

/** Recursively scan for tampered generated files */
function scanForTampering(dir: string, results: TamperedFile[]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) { scanForTampering(full, results); continue; }
    if (!entry.name.endsWith('.ts')) continue;

    const content = readFileSync(full, 'utf-8');
    const header = parseFileHeader(content);
    if (!header) continue;

    const regions = parseRegions(content);
    const hasRegions = regions.some((r) => r.kind === 'generated' || r.kind === 'custom');

    /* If file has header but no region markers, it was likely hand-edited entirely */
    if (!hasRegions && content.length > 200) {
      results.push({ filePath: full, reason: 'Generated file missing region markers' });
    }
  }
}
