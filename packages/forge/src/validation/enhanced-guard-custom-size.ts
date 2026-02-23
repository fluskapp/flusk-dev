/**
 * Find CUSTOM sections that exceed the line limit.
 */

import { resolve, relative } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { parseRegions } from '../regeneration/region-parser.js';
import { parseFileHeader } from '../regeneration/file-header.js';
import type { LargeCustomSection } from './enhanced-guard-types.js';
import { MAX_CUSTOM_LINES } from './enhanced-guard-types.js';
import { walkFiles } from './enhanced-guard-walk.js';

/**
 * Find CUSTOM sections that exceed the line limit.
 */
export function findLargeCustomSections(
  projectRoot: string,
  maxLines: number = MAX_CUSTOM_LINES,
): LargeCustomSection[] {
  const packagesDir = resolve(projectRoot, 'packages');
  if (!existsSync(packagesDir)) return [];

  const large: LargeCustomSection[] = [];
  const allFiles = walkFiles(packagesDir);

  for (const abs of allFiles) {
    const content = readFileSync(abs, 'utf-8');
    const header = parseFileHeader(content);
    if (!header) continue;

    const regions = parseRegions(content);
    for (const region of regions) {
      if (region.kind !== 'custom') continue;

      const trimmed = region.content.trim();
      if (!trimmed) continue;

      const lineCount = trimmed.split('\n').length;
      if (lineCount > maxLines) {
        large.push({
          filePath: relative(projectRoot, abs),
          sectionLabel: region.label || 'default',
          lineCount,
        });
      }
    }
  }
  return large;
}
