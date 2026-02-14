/** @generated —
 * CLI command: flusk status — overview of generated file health.
 *
 * WHY: Developers need a quick way to see which generated files
 * are stale, how many custom sections exist, and the overall
 * generation health of their project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { readFileSync } from 'node:fs';
import { detectChanges, DEFAULT_SCAN_DIRS } from '../regeneration/change-detector.js';
import { extractCustomSections } from '../regeneration/region-parser.js';

export const statusCommand = new Command('status')
  .description('Show generation status: stale files, custom sections')
  .action(() => {
    const root = process.cwd();
    const report = detectChanges(root, DEFAULT_SCAN_DIRS);

    console.log(chalk.blue('\n📊 Generation Status\n'));
    console.log(`  Total generated files: ${chalk.bold(String(report.total))}`);
    console.log(`  Fresh:    ${chalk.green(String(report.fresh.length))}`);
    console.log(`  Stale:    ${chalk.yellow(String(report.stale.length))}`);
    console.log(`  Orphaned: ${chalk.red(String(report.orphaned.length))}`);

    let totalCustom = 0;
    const byEntity = new Map<string, { files: number; stale: number; custom: number }>();

    for (const info of [...report.fresh, ...report.stale]) {
      const entry = byEntity.get(info.yamlPath) ?? { files: 0, stale: 0, custom: 0 };
      entry.files++;
      if (info.isStale) entry.stale++;
      const content = readFileSync(info.filePath, 'utf-8');
      const customs = extractCustomSections(content);
      const nonEmpty = [...customs.values()].filter((v) => v.trim()).length;
      entry.custom += nonEmpty;
      totalCustom += nonEmpty;
      byEntity.set(info.yamlPath, entry);
    }

    console.log(`  Custom sections (non-empty): ${chalk.cyan(String(totalCustom))}`);

    if (byEntity.size > 0) {
      console.log(chalk.blue('\n  Per-entity breakdown:'));
      for (const [yaml, info] of byEntity) {
        const staleTag = info.stale ? chalk.yellow(` (${info.stale} stale)`) : '';
        console.log(`    ${yaml}: ${info.files} files${staleTag}, ${info.custom} custom sections`);
      }
    }

    console.log('');
  });
