/**
 * QA validation agent — comprehensive pre-PR checks.
 *
 * Checks: generator integrity, security, code quality,
 * test coverage, protected file enforcement.
 * Exit code 1 on any FAIL.
 */

import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { minimatch } from 'minimatch';
import { createHash } from 'node:crypto';

const root = resolve(import.meta.dirname, '..');
const config = JSON.parse(
  readFileSync(resolve(root, '.flusk/protected.json'), 'utf-8'),
);

type Status = 'PASS' | 'WARN' | 'FAIL';
interface Check {
  name: string;
  status: Status;
  details: string[];
}

const checks: Check[] = [];
function check(name: string, fn: () => { status: Status; details: string[] }) {
  try {
    checks.push({ name, ...fn() });
  } catch (e: unknown) {
    checks.push({
      name,
      status: 'FAIL',
      details: [`Exception: ${(e as Error).message}`],
    });
  }
}

function walk(dir: string, exts = ['.ts']): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      results.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function matchesAny(rel: string, patterns: string[]): boolean {
  return patterns.some((p) => minimatch(rel, p));
}

// --- 1. Generator Integrity ---
check('Generator Integrity', () => {
  const details: string[] = [];
  let status: Status = 'PASS';
  const yamlDir = resolve(root, 'entities');
  if (!existsSync(yamlDir)) return { status: 'WARN', details: ['No entities/ directory'] };

  const yamls = readdirSync(yamlDir).filter((f) => f.endsWith('.yaml'));
  for (const y of yamls) {
    const name = y.replace('.entity.yaml', '');
    const entityFile = resolve(root, `packages/entities/src/${name}.entity.ts`);
    const typesFile = resolve(root, `packages/types/src/${name}.types.ts`);
    if (!existsSync(entityFile)) {
      details.push(`Missing entity file for ${y}`);
      status = 'WARN';
    }
    if (!existsSync(typesFile)) {
      details.push(`Missing types file for ${y}`);
      status = 'WARN';
    }
  }
  return { status, details: details.length ? details : ['All YAML entities have generated files'] };
});

// --- 2. Security Checks ---
check('Security', () => {
  const details: string[] = [];
  let status: Status = 'PASS';
  const files = walk(resolve(root, 'packages'));
  const secretPatterns = [
    /password\s*[:=]\s*['"][^'"]{4,}['"]/i,
    /secret\s*[:=]\s*['"][^'"]{4,}['"]/i,
    /api[_-]?key\s*[:=]\s*['"][^'"]{8,}['"]/i,
  ];
  const dangerPatterns = [/\beval\s*\(/, /new\s+Function\s*\(/];

  for (const f of files) {
    const content = readFileSync(f, 'utf-8');
    const rel = relative(root, f);
    if (rel.includes('.test.') || rel.includes('__test__')) continue;

    for (const pat of secretPatterns) {
      if (pat.test(content)) {
        details.push(`Possible hardcoded secret: ${rel}`);
        status = 'FAIL';
      }
    }
    for (const pat of dangerPatterns) {
      if (pat.test(content)) {
        details.push(`Dangerous pattern (eval/Function): ${rel}`);
        status = 'FAIL';
      }
    }
  }
  return { status, details: details.length ? details : ['No security issues found'] };
});

// --- 3. Code Quality ---
check('Code Quality', () => {
  const details: string[] = [];
  let status: Status = 'PASS';
  const files = walk(resolve(root, 'packages'));

  for (const f of files) {
    const rel = relative(root, f);
    if (rel.includes('.test.') || rel.includes('node_modules')) continue;
    const content = readFileSync(f, 'utf-8');
    const lines = content.split('\n').length;

    if (lines > 150) {
      details.push(`${rel}: ${lines} lines (max 150)`);
      if (status !== 'FAIL') status = 'WARN';
    }
    if (/\bconsole\.log\b/.test(content) && !rel.includes('cli/')) {
      details.push(`console.log in ${rel} (use @flusk/logger)`);
      if (status !== 'FAIL') status = 'WARN';
    }
    if (/:\s*any\b/.test(content) && !rel.includes('.test.')) {
      details.push(`\`: any\` in ${rel}`);
      if (status !== 'FAIL') status = 'WARN';
    }
  }
  return { status, details: details.length ? details : ['All quality checks passed'] };
});

// --- 4. Test Coverage ---
check('Test Coverage', () => {
  const details: string[] = [];
  let status: Status = 'PASS';
  const pkgsDir = resolve(root, 'packages');
  if (!existsSync(pkgsDir)) return { status: 'FAIL', details: ['No packages/ dir'] };

  for (const pkg of readdirSync(pkgsDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    const pkgPath = resolve(pkgsDir, pkg.name);
    const testFiles = walk(pkgPath).filter(
      (f) => f.includes('.test.') || f.includes('__test__'),
    );
    if (testFiles.length === 0) {
      details.push(`No tests in packages/${pkg.name}`);
      if (status !== 'FAIL') status = 'WARN';
    }
  }
  return { status, details: details.length ? details : ['All packages have tests'] };
});

// --- 5. Protected Files ---
check('Protected Files', () => {
  const details: string[] = [];
  let status: Status = 'PASS';
  const files = walk(resolve(root, 'packages'));

  for (const f of files) {
    const rel = relative(root, f);
    if (!matchesAny(rel, config.protectedPaths ?? config.fullyProtected ?? [])) continue;
    const head = readFileSync(f, 'utf-8').slice(0, 500);
    if (head.includes('@generated')) {
      details.push(`FAKE @generated header in protected file: ${rel}`);
      status = 'FAIL';
    }
  }
  return { status, details: details.length ? details : ['No violations in protected files'] };
});

// --- Report ---
console.log('\n📋 QA Validation Report\n');
let hasFail = false;
for (const c of checks) {
  const icon = c.status === 'PASS' ? '✅' : c.status === 'WARN' ? '⚠️ ' : '❌';
  console.log(`${icon} ${c.status} — ${c.name}`);
  for (const d of c.details) console.log(`    ${d}`);
  if (c.status === 'FAIL') hasFail = true;
}
console.log('');

if (hasFail) {
  console.error('❌ QA validation failed.');
  process.exit(1);
} else {
  console.log('✅ QA validation passed.');
}
