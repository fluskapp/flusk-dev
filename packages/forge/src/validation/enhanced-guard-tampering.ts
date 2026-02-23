/**
 * Detect tampered GENERATED sections using content hashing.
 */

import { resolve, relative } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { computeHash } from '../regeneration/yaml-hash.js';
import { parseRegions } from '../regeneration/region-parser.js';
import { parseFileHeader } from '../regeneration/file-header.js';
import type { TamperedGeneratedFile } from './enhanced-guard-types.js';
import { walkFiles } from './enhanced-guard-walk.js';

/**
 * Detect tampered GENERATED sections using content hashing.
 * Computes a hash of each GENERATED section and compares against
 * the hash embedded in a comment at the end of each section.
 */
export function detectGeneratedTampering(projectRoot: string): TamperedGeneratedFile[] {
  const packagesDir = resolve(projectRoot, 'packages');
  if (!existsSync(packagesDir)) return [];

  const tampered: TamperedGeneratedFile[] = [];
  const allFiles = walkFiles(packagesDir);

  for (const abs of allFiles) {
    const content = readFileSync(abs, 'utf-8');
    const header = parseFileHeader(content);
    if (!header) continue;

    const regions = parseRegions(content);
    for (const region of regions) {
      if (region.kind !== 'generated') continue;

      const hashMatch = region.content.match(/\/\/ @integrity ([a-f0-9]{64})/);
      if (!hashMatch) continue;

      const storedHash = hashMatch[1];
      const contentWithoutHash = region.content
        .split('\n')
        .filter((l) => !l.includes('// @integrity '))
        .join('\n');
      const actualHash = computeHash(contentWithoutHash);

      if (storedHash !== actualHash) {
        tampered.push({
          filePath: relative(projectRoot, abs),
          sectionLabel: region.label || 'default',
          expectedHash: storedHash,
          actualHash,
        });
      }
    }
  }
  return tampered;
}
