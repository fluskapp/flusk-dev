/** @generated —
 * CLI command: flusk regenerate — incremental code regeneration.
 *
 * WHY: After editing entity YAML, developers need to update
 * generated files without losing custom code. This command
 * detects stale files and regenerates only what changed.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resolve } from 'node:path';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { createLogger } from '@flusk/logger';
import { detectChanges, DEFAULT_SCAN_DIRS } from '../regeneration/change-detector.js';
import { smartMerge } from '../regeneration/smart-merge.js';
import { runEntityPipeline } from '../schema/generate-entity-pipeline.js';

const logger = createLogger({ name: 'cmd:regenerate' });

export const regenerateCommand = new Command('regenerate')
  .description('Regenerate stale generated files, preserving custom sections')
  .option('--all', 'Regenerate everything regardless of staleness')
  .option('--dry-run', 'Show what would change without writing')
  .action(async (opts: { all?: boolean; dryRun?: boolean }) => {
    const root = process.cwd();
    const report = detectChanges(root, DEFAULT_SCAN_DIRS);
    const targets = opts.all ? [...report.stale, ...report.fresh] : report.stale;

    console.log(chalk.blue(`\n🔍 Scanned ${report.total} generated files`));
    console.log(`   Stale: ${chalk.yellow(String(report.stale.length))}  Fresh: ${chalk.green(String(report.fresh.length))}  Orphaned: ${chalk.red(String(report.orphaned.length))}\n`);

    if (!targets.length) {
      console.log(chalk.green('✅ Everything is up to date!\n'));
      return;
    }

    const yamlPaths = [...new Set(targets.map((t) => t.yamlPath))];
    let filesUpdated = 0;
    let customPreserved = 0;

    for (const yamlRel of yamlPaths) {
      const yamlAbs = resolve(root, yamlRel);
      if (!existsSync(yamlAbs)) continue;
      logger.info({ yaml: yamlRel }, 'Regenerating from YAML');

      if (opts.dryRun) {
        console.log(`  ${chalk.cyan('would regenerate')} from ${yamlRel}`);
        continue;
      }

      const result = runEntityPipeline(yamlAbs, root);
      for (const f of result.files) {
        const existing = existsSync(f.path) ? readFileSync(f.path, 'utf-8') : null;
        if (existing) {
          const merged = smartMerge(readFileSync(f.path, 'utf-8'), existing);
          writeFileSync(f.path, merged.content, 'utf-8');
          customPreserved += merged.customSectionsPreserved;
          merged.warnings.forEach((w) => console.log(chalk.yellow(`  ⚠️  ${w}`)));
        }
        filesUpdated++;
        console.log(`  ${chalk.green('✅')} ${f.path} (${f.action})`);
      }
    }

    console.log(chalk.green(`\n✨ Regenerated ${filesUpdated} files, preserved ${customPreserved} custom sections\n`));
  });
