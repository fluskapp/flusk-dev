/**
 * OTel hook generator - creates SpanProcessor implementations
 */

import { resolve } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import {
  generateOtelHookContent,
  generateOtelHookTestContent,
} from './otel-hook-templates.js';

export interface OtelHookGenOptions {
  name: string;
  spanFilter?: string;
}

export interface GenResult {
  files: { path: string; action: 'created' }[];
}

export {
  generateOtelHookContent,
  generateOtelHookTestContent,
} from './otel-hook-templates.js';

export async function generateOtelHook(
  opts: OtelHookGenOptions,
): Promise<GenResult> {
  const root = process.cwd();
  const dir = resolve(root, 'packages/otel/src/hooks');
  const testDir = resolve(dir, '__tests__');
  await mkdir(testDir, { recursive: true });

  const result: GenResult = { files: [] };
  const filePath = `packages/otel/src/hooks/${opts.name}.hook.ts`;
  await writeFile(
    resolve(root, filePath),
    generateOtelHookContent(opts),
    'utf-8',
  );
  result.files.push({ path: filePath, action: 'created' });

  const testPath = `packages/otel/src/hooks/__tests__/${opts.name}.hook.test.ts`;
  await writeFile(
    resolve(root, testPath),
    generateOtelHookTestContent(opts.name),
    'utf-8',
  );
  result.files.push({ path: testPath, action: 'created' });

  return result;
}
