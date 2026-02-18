/**
 * Python __init__.py generator — creates barrel exports.
 *
 * WHY: Every Python package directory needs __init__.py with
 * proper __all__ exports for clean import semantics.
 */

import { resolve } from 'node:path';
import { writeFile, mkdir, readdir } from 'node:fs/promises';

/** Generate __init__.py for a directory with __all__ exports */
export async function generatePythonInit(
  dir: string,
  modules: string[],
): Promise<{ path: string; content: string }> {
  await mkdir(dir, { recursive: true });

  const imports = modules.map((m) => `from .${m} import *  # noqa: F403`);

  const content = [
    '# --- BEGIN GENERATED ---',
    '"""Auto-generated package exports."""',
    '',
    ...imports,
    '# --- END GENERATED ---',
    '',
  ].join('\n');

  const filePath = resolve(dir, '__init__.py');
  await writeFile(filePath, content, 'utf-8');

  return { path: filePath, content };
}

/** Generate an empty __init__.py */
export async function generateEmptyInit(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
  await writeFile(resolve(dir, '__init__.py'), '', 'utf-8');
}

/** Generate root __init__.py with version and key imports */
export async function generateRootInit(
  dir: string,
  entityNames: string[],
): Promise<void> {
  await mkdir(dir, { recursive: true });
  const imports = entityNames.map(
    (n) => `from flusk.entities.${n} import *  # noqa: F403`,
  );
  const content = [
    '# --- BEGIN GENERATED ---',
    '"""Flusk — LLM cost optimization."""',
    '',
    '__version__ = "0.1.0"',
    '',
    'from flusk.entities.base import FluskBaseModel',
    ...imports,
    '# --- END GENERATED ---',
    '',
  ].join('\n');
  await writeFile(resolve(dir, '__init__.py'), content, 'utf-8');
}

/** Scan directory for .py modules (excluding __init__) */
export async function listModules(dir: string): Promise<string[]> {
  const files = await readdir(dir);
  return files
    .filter((f) => f.endsWith('.py') && f !== '__init__.py')
    .map((f) => f.replace('.py', ''));
}
