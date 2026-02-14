/**
 * Detect which generated files are stale and need regeneration.
 *
 * WHY: Avoid regenerating everything on every run. By comparing
 * YAML hashes in file headers with current YAML, we regenerate
 * only what changed — fast feedback loop for developers.
 */

import { resolve } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { parseFileHeader } from './file-header.js';
import { hashYamlFile } from './yaml-hash.js';

const logger = createLogger({ name: 'regen:detect' });

/** A generated file that may need regeneration */
export interface GeneratedFileInfo {
  filePath: string;
  yamlPath: string;
  storedHash: string;
  currentHash: string;
  isStale: boolean;
}

/** Summary of change detection across the project */
export interface ChangeReport {
  total: number;
  stale: GeneratedFileInfo[];
  fresh: GeneratedFileInfo[];
  orphaned: string[];
}

/**
 * Scan directories for generated files and detect staleness.
 * Looks for `@generated from` headers in .ts files.
 */
export function detectChanges(
  projectRoot: string,
  scanDirs: string[],
): ChangeReport {
  const report: ChangeReport = { total: 0, stale: [], fresh: [], orphaned: [] };

  for (const dir of scanDirs) {
    const absDir = resolve(projectRoot, dir);
    if (!existsSync(absDir)) continue;
    scanDirectory(absDir, projectRoot, report);
  }

  logger.info({ total: report.total, stale: report.stale.length },
    'Change detection complete');
  return report;
}

/** Recursively scan a directory for generated .ts files */
function scanDirectory(
  dir: string,
  projectRoot: string,
  report: ChangeReport,
): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) { scanDirectory(full, projectRoot, report); continue; }
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.sql')) continue;

    const content = readFileSync(full, 'utf-8');
    const header = parseFileHeader(content);
    if (!header) continue;

    report.total++;
    const yamlAbs = resolve(projectRoot, header.yamlPath);
    if (!existsSync(yamlAbs)) {
      report.orphaned.push(full);
      logger.warn({ file: full }, 'Orphaned — source YAML missing');
      continue;
    }

    const currentHash = hashYamlFile(yamlAbs);
    const info: GeneratedFileInfo = {
      filePath: full, yamlPath: header.yamlPath,
      storedHash: header.yamlHash, currentHash, isStale: currentHash !== header.yamlHash,
    };
    (info.isStale ? report.stale : report.fresh).push(info);
  }
}

/** Default directories to scan for generated files */
export const DEFAULT_SCAN_DIRS = [
  'packages/entities/src',
  'packages/types/src',
  'packages/resources/src',
  'packages/execution/src',
];
