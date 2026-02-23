/**
 * Individual enhanced guard check functions.
 */

import { resolve, relative } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { computeHash } from '../regeneration/yaml-hash.js';
import { parseRegions } from '../regeneration/region-parser.js';
import { parseFileHeader } from '../regeneration/file-header.js';
import type { TamperedGeneratedFile, LargeCustomSection } from './enhanced-guard-types.js';
import { MAX_CUSTOM_LINES } from './enhanced-guard-types.js';
import { walkFiles } from './enhanced-guard-walk.js';

/**
 * Check 1: Find new .ts/.tsx files in packages/ (except forge/) without @generated headers.
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

/**
 * Check 2: Detect tampered GENERATED sections using content hashing.
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

/**
 * Check 3: Find CUSTOM sections that exceed the line limit.
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
