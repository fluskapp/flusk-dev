/**
 * CLI command: flusk guard — scan repo for @generated header violations.
 *
 * WHY: AI agents keep adding fake @generated headers to hand-written
 * files. This command detects violations so CI can block them.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { resolve, relative } from 'node:path';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { minimatch } from 'minimatch';

interface ProtectedConfig {
  protectedPaths: string[];
  generatorOwnedPaths: string[];
}

function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      results.push(...walk(full));
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) {
      results.push(full);
    }
  }
  return results;
}

function hasGeneratedHeader(filePath: string): boolean {
  const head = readFileSync(filePath, 'utf-8').slice(0, 500);
  return head.includes('@generated');
}

function matchesAny(rel: string, patterns: string[]): boolean {
  return patterns.some((p) => minimatch(rel, p));
}

export const guardCommand = new Command('guard')
  .description('Scan for @generated header violations')
  .option('--json', 'Output machine-readable JSON')
  .action(async (opts: { json?: boolean }) => {
    const root = process.cwd();
    const cfgPath = resolve(root, '.flusk/protected.json');
    if (!existsSync(cfgPath)) {
      console.error(chalk.red('Missing .flusk/protected.json'));
      process.exit(1);
    }
    const config: ProtectedConfig = JSON.parse(readFileSync(cfgPath, 'utf-8'));

    const allFiles = walk(resolve(root, 'packages'));
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const abs of allFiles) {
      const rel = relative(root, abs);
      const hasHeader = hasGeneratedHeader(abs);
      const isProtected = matchesAny(rel, config.protectedPaths);
      const isGenOwned = matchesAny(rel, config.generatorOwnedPaths);

      if (isProtected && hasHeader) {
        errors.push(`FAKE HEADER in protected file: ${rel}`);
      } else if (hasHeader && !isGenOwned && !isProtected) {
        warnings.push(`@generated header on non-generator file: ${rel}`);
      } else if (isGenOwned && !hasHeader) {
        warnings.push(`Generator-owned file missing @generated: ${rel}`);
      }
    }

    if (opts.json) {
      console.log(JSON.stringify({ errors, warnings }));
    } else {
      for (const e of errors) console.error(chalk.red(`❌ ERROR: ${e}`));
      for (const w of warnings) console.warn(chalk.yellow(`⚠️  WARN: ${w}`));
      const total = errors.length + warnings.length;
      if (total === 0) {
        console.log(chalk.green('✅ No guard violations found.'));
      } else {
        console.log(
          `\n${errors.length} error(s), ${warnings.length} warning(s)`,
        );
      }
    }

    if (errors.length > 0) process.exit(1);
  });
