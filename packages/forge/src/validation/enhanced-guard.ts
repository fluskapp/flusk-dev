/**
 * Enhanced guard checks — block non-generator code, detect tampering, warn on large CUSTOM sections.
 *
 * WHY: Make it impossible to add code without going through generators/YAML.
 * This module provides the core logic; the CLI guard command consumes it.
 */

import { resolve, relative } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { computeHash } from '../regeneration/yaml-hash.js';
import { parseRegions } from '../regeneration/region-parser.js';
import { parseFileHeader } from '../regeneration/file-header.js';

/** Result of enhanced guard scan */
export interface EnhancedGuardResult {
  missingHeaders: string[];
  tamperedFiles: TamperedGeneratedFile[];
  largeCustomSections: LargeCustomSection[];
}

/** A file where GENERATED section hash doesn't match expected */
export interface TamperedGeneratedFile {
  filePath: string;
  sectionLabel: string;
  expectedHash: string;
  actualHash: string;
}

/** A CUSTOM section that exceeds the line threshold */
export interface LargeCustomSection {
  filePath: string;
  sectionLabel: string;
  lineCount: number;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.turbo', 'coverage', '.git']);
const MAX_CUSTOM_LINES = 30;

/** Walk a directory tree collecting .ts/.tsx files */
function walkFiles(dir: string): string[] {
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
    // Skip forge/, test files, .d.ts, index.ts
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
 * Computes a hash of each GENERATED section and stores/compares against
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
    if (!header) continue; // Not a generated file

    const regions = parseRegions(content);
    for (const region of regions) {
      if (region.kind !== 'generated') continue;

      // Check if region has an integrity hash comment
      const hashMatch = region.content.match(/\/\/ @integrity ([a-f0-9]{64})/);
      if (!hashMatch) continue; // No integrity hash embedded — skip (legacy files)

      const storedHash = hashMatch[1];
      // Hash the content WITHOUT the integrity line itself
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
      if (!trimmed) continue; // Empty custom section

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

/**
 * Run all enhanced guard checks.
 */
export function runEnhancedGuard(projectRoot: string): EnhancedGuardResult {
  return {
    missingHeaders: findMissingHeaders(projectRoot),
    tamperedFiles: detectGeneratedTampering(projectRoot),
    largeCustomSections: findLargeCustomSections(projectRoot),
  };
}
