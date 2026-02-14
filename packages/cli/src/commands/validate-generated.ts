/**
 * CLI command: flusk validate-generated
 *
 * WHY: CI needs to reject PRs where generated files are stale
 * or hand-edited outside CUSTOM regions. This command checks
 * all @generated files against their source YAML hashes.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { createLogger } from '@flusk/logger';
import { detectChanges, DEFAULT_SCAN_DIRS } from '../regeneration/change-detector.js';
import { detectTampering } from '../validation/tampering-detector.js';

const logger = createLogger({ name: 'cmd:validate-generated' });

export const validateGeneratedCommand = new Command('validate-generated')
  .description('Check that all generated files match their source schemas')
  .option('--strict', 'Exit 1 on any stale or tampered files')
  .action(async (opts: { strict?: boolean }) => {
    const root = process.cwd();
    const report = detectChanges(root, DEFAULT_SCAN_DIRS);
    const tampered = detectTampering(root, DEFAULT_SCAN_DIRS);

    logger.info({ total: report.total, stale: report.stale.length }, 'Validation complete');

    for (const f of report.fresh) {
      console.log(chalk.green(`  ✅ ${f.filePath}`));
    }
    for (const f of report.stale) {
      console.log(chalk.yellow(`  ⚠️  stale: ${f.filePath} (YAML changed)`));
    }
    for (const f of report.orphaned) {
      console.log(chalk.red(`  ❌ orphaned: ${f} (source YAML missing)`));
    }
    for (const t of tampered) {
      console.log(chalk.red(`  ❌ tampered: ${t.filePath} — ${t.reason}`));
    }

    const issues = report.stale.length + report.orphaned.length + tampered.length;
    console.log(`\n  Total: ${report.total} | Fresh: ${report.fresh.length} | Stale: ${report.stale.length} | Tampered: ${tampered.length}\n`);

    if (issues > 0 && opts.strict) {
      console.log(chalk.red('❌ Validation failed. Run `flusk regenerate` to fix stale files.\n'));
      process.exit(1);
    }
    if (issues === 0) {
      console.log(chalk.green('✅ All generated files are up to date!\n'));
    }
  });
