/**
 * Pre-commit check: block fake @generated headers on protected files.
 *
 * Reads .flusk/protected.json, checks staged files, and:
 * - REJECTS commits that only add @generated headers to protected files
 * - WARNS when protected files are modified substantively
 * - Exit code 1 to block commit on violations
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { minimatch } from 'minimatch';

interface ProtectedConfig {
  protectedPaths: string[];
  generatorOwnedPaths: string[];
}

const root = resolve(import.meta.dirname, '..');
const config: ProtectedConfig = JSON.parse(
  readFileSync(resolve(root, '.flusk/protected.json'), 'utf-8'),
);

function matchesAny(file: string, patterns: string[]): boolean {
  return patterns.some((p) => minimatch(file, p));
}

function getStagedFiles(): string[] {
  const out = execSync('git diff --cached --name-only', {
    cwd: root,
    encoding: 'utf-8',
  });
  return out.trim().split('\n').filter(Boolean);
}

function isHeaderOnlyChange(file: string): boolean {
  const diff = execSync(
    `git diff --cached -U0 -- "${file}"`,
    { cwd: root, encoding: 'utf-8' },
  );
  const addedLines = diff
    .split('\n')
    .filter((l) => l.startsWith('+') && !l.startsWith('+++'))
    .map((l) => l.slice(1).trim());
  const removedLines = diff
    .split('\n')
    .filter((l) => l.startsWith('-') && !l.startsWith('---'))
    .map((l) => l.slice(1).trim());

  if (removedLines.length > 0) return false;
  return (
    addedLines.length > 0 &&
    addedLines.every(
      (l) =>
        l === '' ||
        l.includes('@generated') ||
        l.startsWith('*') ||
        l.startsWith('//') ||
        l.startsWith('/**'),
    )
  );
}

let errors = 0;
let warnings = 0;
const staged = getStagedFiles();

for (const file of staged) {
  if (!matchesAny(file, config.protectedPaths)) continue;

  if (isHeaderOnlyChange(file)) {
    console.error(
      `❌ BLOCKED: "${file}" is protected and diff only adds @generated header.`,
    );
    errors++;
  } else {
    console.warn(`⚠️  Protected file modified: ${file}. Are you sure?`);
    warnings++;
  }
}

if (errors > 0) {
  console.error(
    `\n🚫 ${errors} protected file(s) had fake @generated headers added. Commit blocked.`,
  );
  process.exit(1);
}

if (warnings > 0) {
  console.warn(`\n⚠️  ${warnings} protected file(s) modified substantively.`);
}
