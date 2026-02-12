import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const otelDir = resolve(import.meta.dirname, '..');
const rootDir = resolve(otelDir, '..', '..');

describe('architecture guardrails', () => {
  it('no file in packages/otel imports openai or @anthropic-ai', () => {
    const result = execSync(
      `grep -r "from ['\\"](openai|@anthropic-ai)" src/ --include="*.ts" -l || true`,
      { cwd: otelDir, encoding: 'utf-8' },
    ).trim();
    expect(result).toBe('');
  });

  it('no wrap* exports in packages/otel or packages/sdk', () => {
    const result = execSync(
      `grep -r "export.*\\bwrap[A-Z]" packages/otel/src packages/sdk/src --include="*.ts" -l 2>/dev/null || true`,
      { cwd: rootDir, encoding: 'utf-8' },
    ).trim();
    expect(result).toBe('');
  });

  it('packages/otel has no dependency on packages/sdk', () => {
    const pkg = JSON.parse(readFileSync(resolve(otelDir, 'package.json'), 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
    expect(allDeps).not.toHaveProperty('@flusk/sdk');
    expect(allDeps).not.toHaveProperty('flusk');
  });

  it('register.ts auto-starts the SDK (import side-effect)', () => {
    const source = readFileSync(resolve(otelDir, 'src', 'register.ts'), 'utf-8');
    expect(source).toContain('sdk.start()');
    // Must call at module level, not inside a function
    const lines = source.split('\n');
    const startLine = lines.find((l) => l.includes('sdk.start()'));
    expect(startLine).toBeDefined();
    expect(startLine!.startsWith('  ')).toBeFalsy(); // not indented = top-level
  });
});
