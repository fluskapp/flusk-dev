/**
 * Prompt generator I/O — file loading and writing helpers.
 */

import { resolve } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { PromptSchema, GenResult } from './prompt.generator.js';

export async function loadSchema(yamlPath: string): Promise<PromptSchema> {
  return parseYaml(await readFile(yamlPath, 'utf-8')) as PromptSchema;
}

export async function writeGenFile(
  root: string,
  relPath: string,
  content: string,
  result: GenResult,
): Promise<void> {
  const abs = resolve(root, relPath);
  await mkdir(resolve(abs, '..'), { recursive: true });
  await writeFile(abs, content, 'utf-8');
  result.files.push({ path: relPath, action: 'created' });
}
