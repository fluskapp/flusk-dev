/**
 * CLI command: flusk ratio — generator coverage reporter.
 *
 * WHY: Track progress toward 90% generated code target.
 * Shows generated vs total files per package, with a gap
 * indicator to motivate closing the coverage gap.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { computeRatio } from '@flusk/forge';

const TARGET_PERCENT = 90;

export const ratioCommand = new Command('ratio')
  .description('Report generator coverage ratio across packages')
  .option('--json', 'Output machine-readable JSON')
  .action(async (opts: { json?: boolean }) => {
    const root = process.cwd();
    const result = computeRatio(root);
    const pct = result.total > 0 ? (result.generated / result.total) * 100 : 0;
    const gap = Math.max(0, TARGET_PERCENT - pct);

    if (opts.json) {
      console.log(JSON.stringify({ ...result, percent: +pct.toFixed(1), target: TARGET_PERCENT, gap: +gap.toFixed(1) }));
      return;
    }

    console.log(chalk.blue(`\n📊 Generator Ratio Report\n`));
    console.log(`  Generator ratio: ${result.generated}/${result.total} files (${pct.toFixed(1)}%)`);
    console.log(`  Target: ${TARGET_PERCENT}% | Current: ${pct.toFixed(1)}% | Gap: ${gap.toFixed(1)}%\n`);

    console.log(chalk.dim('  By package:'));
    for (const [pkg, counts] of Object.entries(result.byPackage)) {
      const pkgPct = counts.total > 0 ? ((counts.generated / counts.total) * 100).toFixed(1) : '0.0';
      const icon = +pkgPct >= TARGET_PERCENT ? '✅' : '📈';
      console.log(`    ${icon} ${pkg}: ${counts.generated}/${counts.total} (${pkgPct}%)`);
    }
    console.log('');
  });
